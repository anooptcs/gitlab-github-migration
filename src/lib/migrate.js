'use strict';

import log from '../lib/logger';
import manifest from './manifest.json';
import settings from '../../settings.json';
import pkg from '../../package.json';

import request from 'request-promise-native';
import moment from 'moment';
import waitFor from 'p-wait-for';

const gitLabOpts = {
  url: `https://gitlab.com/api/v3/`,
  headers: {
    "PRIVATE-TOKEN": settings.gitlab.token
  },
  json: true
};

const gitHubOpts = {
  url: `https://api.github.com/`,
  headers: {
    "User-Agent": pkg.name,
    Authorization: `token ${settings.github.token}`,
    Accept: `application/vnd.github.v3+json`,
    "Cache-Control": `no-cache,no-store`
  },
  json: true
};

// cached know repos here.
let gitLabRepos;
let gitHubRepos;

/**
 * Simple deep object clone.
 * @method _clone
 * @param {Object} obj to be cloned
 * @return {Object} clone
 */
function _clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function _labels(ghRepo, glRepo) {
  log.debug(`_labels: ${ghRepo.name}`);
  return new Promise((resolve, reject) => {
    let glLabels;
    let ghLabels;
    let glOpts    = _clone(gitLabOpts);
    let ghOpts    = _clone(gitHubOpts);
    let ghBaseURL = ghOpts.url;
    let glBaseURL = glOpts.url;
    glOpts.url += `projects/${glRepo.id}/labels`;
    ghOpts.url += `repos/${settings.github.org}/${ghRepo.name}/labels`;

    request(glOpts)
      .then(response => {
        if (response.length) {
          glLabels = response;
          //log.debug(`-> have gl labels ${ghRepo.name}`);
          //console.log(ghOpts);
          return request(ghOpts);
        } else {
          resolve(`no labels`);
        }
      })
      .then(response => {
        ghLabels = response;
        let newLabels = [];

        //log.debug(`-] have gh labels ${ghRepo.name}`);
        // now have all the labels for this repo.
        for (let glLabel of glLabels) {
          //console.log(`gllbael:`, glLabel);
          let found = ghLabels.find(element => {
            //console.log(`ghlabel: `, element);
            return element.name === glLabel.name;
          });

          ///  log.debug(`found: ${found}`);

          if (!found) {
            //log.debug(`- new label called ${glLabel.name} for ${ghRepo.name}, adding`);
            ghOpts.method = `POST`;
            ghOpts.url    = ghBaseURL + `repos/${settings.github.org}/${ghRepo.name}/labels`;
            ghOpts.body   = {
              name: glLabel.name,
              color: glLabel.color.replace(/\#/, ``)
            };
            console.log(ghOpts);
            newLabels.push(
              request(ghOpts)
            );
          }
        }

        if (newLabels.length) {
          //log.debug(`process new labels`);
          Promise.all(newLabels)
            .then(() => {
              //  log.debug(`labels added for ${ghRepo.name}`);
              resolve(`labels added`);
            })
            .catch(err => {
              log.error(`label add loop failed for ${ghRepo.name}`);
              throw new Error(err);
            })
        } else {
          //log.debug(`no labels to add to ${ghRepo.name}, skipping`);
          resolve();
        }
      })
      .catch(err => {
        log.error(`labels fail `);
        reject(err);
      })
  });
}

function _migrate(repo) {
  //  - find corresponding glRepo
  //   - get glLabels
  //   - get ghLabels
  //
  //   - for each glLabel
  //    - if glLabel not in ghLabels
  //     - add ghLabel
  return new Promise((resolve, reject) => {
    log.info(`_migrate ${repo.name}`);

    let glr = gitLabRepos.find(element => {
      return element.name === repo.name;
    });

    if (!glr) {
      resolve(`no corresponding repo found on gitlab, skipping...`);
    } else {
      _labels(repo, glr)
        .then(() => {
          resolve();
        })
        .catch(err => {
          log.error(`_migrate ${repo.name} failed`);
          reject(err);
        });
    }
  });
}

/**
 * Import single repo form gitlab into github.
 * <ul>
 * <li>fetch known repos
 * <li>check if project exists in gitlab, if false error and exit
 * <li>check if project exists in github, if true error and exit
 * <li>create repo on github
 * <li>import from gitlab into github
 * </ul>
 * @method _import
 * @param {string} project gitlab project name to import
 * @return {Promise}
 * @private
 */
function _import(project) {
  let ghopts  = _clone(gitHubOpts);
  let baseURL = ghopts.url;
  let glr;
  let ghr;
  return new Promise((resolve, reject) => {
    _fetch()
      .then(status => {
        log.debug(`- fetch status: ${status}`);
        log.debug(`- test if gl has project ${project}`);
        glr = gitLabRepos.find(element => {
          return element.name === project;
        });

        if (glr) {
          log.info(`gitlab has repo for ${project}`);
        } else {
          throw new Error(`no repo called ${project} found on gitlab!`);
        }
      })
      .then(repos => {
        log.debug(`- test if gh has project ${project}`);
        ghr = gitHubRepos.find(element => {
          return element.name === project;
        });

        if (ghr) {
          throw new Error(`github already has a repo for ${project}`);
        } else {
          log.info(`create new github repo for ${project}`);
          ghopts.method = `POST`;
          ghopts.url    = baseURL + `orgs/${settings.github.org}/repos`;
          ghopts.body   = {
            name: project,
            private: true,
            description: glr.description.replace(/[\n\t\r]/g, ` `) || glr.name
          };
          return request(ghopts);
        }
      })
      .then(() => {
        log.info(`start import from gitlab`);
        ghopts.method            = `PUT`;
        ghopts.url               = baseURL + `repos/${settings.github.org}/${project}/import`;
        ghopts.headers[`Accept`] = `application/vnd.github.barred-rock-preview`;
        ghopts.body              = {
          vcs_url: glr.web_url,
          vcs: `git`,
          vcs_username: settings.gitlab.user,
          vcs_password: settings.gitlab.password
        };
        //console.log(ghopts);
        return request(ghopts);
      })
      .then(body => {
        log.info(`check import progress`);
        ghopts.method            = `GET`;
        ghopts.url               = baseURL + `repos/${settings.github.org}/${project}/import`;
        ghopts.body              = null;
        ghopts.headers[`Accept`] = `application/vnd.github.barred-rock-preview`;

        //console.log(ghopts);

        return waitFor(() => request(ghopts)
          .then(res => {
            if (res.status === `complete`) {
              return true;
            // } else if (res.status === `importing`) {
            //   _mapAuthors(project);
            } else if (res.status === `error`) {
              throw new Error(`import failed`, res.status_text);
            }
            log.debug(`import progress: ${res.status}`);
            return false;
          }), 500);
      })
      .then(() => {
        resolve(`import of ${project} complete`);
      })
      .catch(function(err) {
        reject(err);
      });
  });
}

function _mapAuthors(project) {
  log.info(`map import authors`);
  let options = _clone(gitHubOpts);
  let url     = options.url;
  options.url               = url + `repos/${settings.github.org}/${project}/import/authors`
  options.body              = null;
  options.headers[`Accept`] = `application/vnd.github.barred-rock-preview`;
  console.log(options);
  return new Promise((resolve, reject) => {
    request(options)
      .then(response => {
        console.log(response);
        resolve();
      })
      .catch(err => {
        reject(err);
      })
  });
}

/**
 * Fetch and cache known repos.
 * @method _fetch
 * @return {Promise}
 * @private
 */
function _fetch() {
  log.debug(`fetch known repos`);
  return new Promise((resolve, reject) => {
    if (gitLabRepos && gitHubRepos) {
      resolve(`already fetched`);
    } else {
      _getRepos()
        .then(repos => {
          gitLabRepos = repos;
          return _getRepos(false);
        })
        .then(repos => {
          gitHubRepos = repos;
          resolve(`fetched`);
        })
        .catch(err => {
          reject(err);
        });
    }
  });
}

/**
 * Get known repos for either gitlab or github
 * @method _getRepos
 * @param {Boolean} [isGitlab=true] if true, fetch from gitlab, else from github
 * @return {Promise}
 * @private
 */
function _getRepos(isGitlab = true) {
  return new Promise((resolve, reject) => {
    let options = isGitlab ? _clone(gitLabOpts) : _clone(gitHubOpts);
    options.url += isGitlab ? `projects?per_page=100` : `orgs/${settings.github.org}/repos?per_page=100&now=${moment().unix()}`;

    request(options)
      .then(repos => {
        resolve(repos);
      })
      .catch(err => {
        reject(err);
      });
  });
}

/**
 * Import single project from gitlab into github.
 * @method importer
 * @see {@link _import}
 * @param {string} project name of project to import
 */
export function importer(project) {
  if (!project) {
    log.error(`No project name passed!`);
    return;
  }

  log.info(`Import repo: ${project}`);

  _import(project)
    .then(() => {
      log.info(`imported ${project} succesfully`);
    })
    .catch(err => {
      log.error(`import failed:`, err);
    });
}
/**
 * Import single project from gitlab into github.
 * @method authors
 * @see {@link _import}
 */
export function authors() {
  log.info(`Add email address for users`);

  _mapAuthors()
    .then(() => {
      log.info(`mapped`);
    })
    .catch(err => {
      log.error(`mapping failed:`, err);
    });
}
/**
 * List known gitlab and github repos
 * @method projects
 */
export function projects() {
  _fetch()
    .then(status => {
      log.debug(`repos fetched`);
      log.info(`GitLab repos (${gitLabRepos.length}):`);
      for (let repo of gitLabRepos) {
        console.log(`> ${repo.id}:${repo.name}:${repo.description}:${repo.web_url}`);
      }
      console.log(`---`);
      log.info(`GitHub repos (${gitHubRepos.length}):`);
      for (let repo of gitHubRepos) {
        console.log(`> ${repo.id}:${repo.name}:${repo.description}:${repo.url}`);
      }
    })
    .catch(err => {
      log.error(err);
    });
}

export function importAll() {
  let toImport = [];
  _fetch()
    .then(status => {
      log.debug(`importAll fetch: ${status}`);
      for (let repo of gitLabRepos) {
        console.log(`> ${repo.id}:${repo.name}:${repo.description}:${repo.web_url}`);
        toImport.push(_import(repo.name));
      }

      Promise.all(toImport)
        .then(() => {
          log.info(`import all complete`);
        })
        .catch(err => {
          throw new Error(err);
        });
    })
    .catch(err => {
      log.error(err);
    });
}

/**
 * List known apps.
 * @method list
 */
export function list() {
  console.log(manifest.apps);
}

export function remove(project) {
  let options = _clone(gitHubOpts);
  options.method = `DELETE`;
  options.url += `repos/${settings.github.org}/${project}`
  request(options)
    .then(response => {
      log.info(response);
    })
    .catch(err => {
      log.error(err);
    });
}

export function migrateAll() {
  let toMigrate = [];
  _fetch()
    .then(status => {
      log.debug(`migrate all fetch: ${status}`);
      for (let repo of gitHubRepos) {
        toMigrate.push(_migrate(repo));
      }

      Promise.all(toMigrate)
        .then(() => {
          log.info(`migrate all complete`);
        })
        .catch(err => {
          log.error(`migrate all: bang!`);
          throw new Error(err);
        });

    })
    .catch(err => {
      log.error(`migrate all bang`);
      log.error(err);
    });
}

export function migrate(project) {
  _fetch()
    .then(status => {
      log.debug(`migrate fetch: ${status}`);
      let ghRepo = gitHubRepos.find(element => {
        return element.name === project;
      });

      if (ghRepo) {
        return _migrate(ghRepo);
      } else {
        throw new Error(`unknown repo ${project}`);
      }
    })
    .catch(err => {
      log.error(`migrate bang`);
      log.error(err);
    });
}
