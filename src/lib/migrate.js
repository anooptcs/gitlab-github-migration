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
  let ghopts  = _clone(githubOpts);
  let baseURL = ghopts.url;
  let glr;
  let ghr;
  log.info(`Import repo: ${project}`);
  ghopts.url += `orgs/${settings.github.org}/repos?per_page=100`;

  // check if repo exists on github
  //  - create repo on github
  // kick off import
  getProjects()
    .then(repos => {
      glr = repos.find(element => {
        return element.name === project;
      });

      if (glr) {
        return getProjects(false);
      } else {
        throw new Error(`no repo called ${project} found on gitlab!`);
      }
    })
    .then(repos => {
      ghr = repos.find(element => {
        return element.name === project;
      });

      if (!ghr) {
        log.info(`create new repo`);
        ghopts.method = `POST`;
        ghopts.url    = baseURL + `orgs/${settings.github.org}/repos`;
        ghopts.body   = {
          name: project,
          private: true,
          description: glr.description || glr.name
        };
        return request(ghopts);
      }
    })
    .then(() => {
      log.info(`start import `);
      ghopts.method            = `PUT`;
      ghopts.url               = baseURL + `repos/${settings.github.org}/${project}/import`;
      ghopts.headers[`Accept`] = `application/vnd.github.barred-rock-preview`;
      ghopts.body              = {
        vcs_url: glr.web_url,
        vcs: `git`,
        vcs_username: settings.gitlab.user,
        vcs_password: settings.gitlab.password
      };
      console.log(ghopts);
      return request(ghopts);
    })
    .then(body => {
      log.info(`check import progress`);
      ghopts.method            = `GET`;
      ghopts.url               = baseURL + `repos/${settings.github.org}/${project}/import`;
      ghopts.body              = null;
      ghopts.headers[`Accept`] = `application/vnd.github.barred-rock-preview`;

      console.log(ghopts);

      return waitFor(() => request(ghopts)
        .then(res => {
          if (res.status === `complete`) {
            return true;
          } else if (res.status === `error`) {
            throw new Error(`import failed`, res.status_text)
          }

          return false;
        }))
    })
    .catch(function(err) {
      log.error(`no repos :(`);
      console.error(err);
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
