'use strict';

import log from '../lib/logger';
import manifest from './manifest.json';
import settings from '../../settings.json';

import request from 'request-promise-native';
import waitFor from 'p-wait-for';

const gitlabOpts = {
  url: `https://gitlab.com/api/v3/`,
  headers: {
    "PRIVATE-TOKEN": settings.gitlab.token
  },
  json: true
};

const githubOpts = {
  url: `https://api.github.com/`,
  headers: {
    "User-Agent": "ma-migrate",
    Authorization: `token ${settings.github.token}`
  },

  json: true
};

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

export function importer(project) {
  log.info(`Import repo: ${project}`);

  _import(project)
    .then(() => {
      log.info(`imported ${project} succesfully`);
    })
    .catch(err => {
      log.error(`import failed:`, err);
    });
}

function _import(project) {
  let ghopts  = _clone(githubOpts);
  let baseURL = ghopts.url;
  let glr;
  let ghr;
  return new Promise((resolve, reject) => {

    // check if repo exists on github
    //  - create repo on github
    // kick off import
    _fetch()
      .then((status) => {
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
            } else if (res.status === `error`) {
              throw new Error(`import failed`, res.status_text)
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

function _fetch() {
  log.debug(`fetch known repos`);
  return new Promise((resolve, reject) => {
    if (gitLabRepos && gitHubRepos) {
      resolve(`already fetched`);
    } else {
      getProjects()
        .then(repos => {
          gitLabRepos = repos;
          return getProjects(false);
        })
        .then(repos => {
          gitHubRepos = repos;
          resolve(`fetched`);
        })
        .catch(err => {
          reject(err);
        })
    }
  });
}

function getProjects(isGitlab = true) {
  return new Promise((resolve, reject) => {
    let options = isGitlab ? _clone(gitlabOpts) : _clone(githubOpts);
    options.url += isGitlab ? `projects?per_page=100` : `orgs/${settings.github.org}/repos?per_page=100`;

    request(options)
      .then(repos => {
        resolve(repos);
      })
      .catch(err => {
        reject(err);
      });
  });
}

export function projects() {
  getProjects()
    .then(glr => {
      for (let repo of glr) {
        console.log(`gl repo ${repo.id}:${repo.name}:${repo.description}:${repo.web_url}`);
      }
      console.log(`---`);
      return getProjects(false);
    })
    .then(ghr => {
      for (let repo of ghr) {
        console.log(`gh repo ${repo.id}:${repo.name}:${repo.description}`);
      }

    }).catch(function(err) {
    console.error(err);
  });
}

/**
 * List known apps.
 * @method list
 */
export function list() {
  console.log(manifest.apps);
}
