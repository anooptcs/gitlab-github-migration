'use strict';

import manifest from './manifest.json';
import settings from '../../settings.json';

import request from 'request-promise-native';

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

export function projects() {
  let options = _clone(gitlabOpts);
  let ghopts  = _clone(githubOpts);
  let glr;
  let ghr;
  options.url += `projects?per_page=100`;
  ghopts.url += `orgs/${settings.github.org}/repos?per_page=100`;

  request(options).then(repos => {
    glr = repos;
    for (let repo of glr) {
      console.log(`gl repo ${repo.id}:${repo.name}`);
    }
    return request(ghopts);
  }).then(repos => {
    ghr = repos;

    for (let repo of ghr) {
      console.log(`gh repo ${repo.id}:${repo.name}`);
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
