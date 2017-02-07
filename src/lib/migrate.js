'use strict';
/** @flow */
import log from '../lib/logger';
import settings from '../../settings.json';
import pkg from '../../package.json';

import request from 'request-promise';
import Promise from 'bluebird';
import moment from 'moment';
import waitFor from 'p-wait-for';

const gitLabOpts = {
  url: `https://gitlab.com/api/v3/`,
  headers: {
    "PRIVATE-TOKEN": settings.gitlab.token
  },
  json: true,
  timeout: 10000
};

const gitHubOpts = {
  url: `https://api.github.com/`,
  headers: {
    "User-Agent": pkg.name,
    Authorization: `token ${settings.github.token}`,
    Accept: `application/vnd.github.v3+json`,
    "Cache-Control": `no-cache,no-store`
  },
  json: true,
  timeout: 20000,
  pool: {
    maxSockets: 2
  }
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
function _clone(obj: Object): Object {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Get gitlab labels for repo, recreate for github repo.
 * @method _labels
 * @param {Object} ghRepo github repo
 * @param {Object} glRepo gitlab repo
 * @return {(Object|boolean)}
 * @private
 */
async function _labels(ghRepo: Object, glRepo: Object): (Object|boolean) {
  try {
    log.debug(`_labels: ${ghRepo.name}`);
    let glLabels;
    let ghLabels;
    const glOpts    = _clone(gitLabOpts);
    const ghOpts    = _clone(gitHubOpts);
    const ghBaseURL = ghOpts.url;
    glOpts.url += `projects/${glRepo.id}/labels`;
    ghOpts.url += `repos/${settings.github.org}/${ghRepo.name}/labels`;

    const response = await request(glOpts);

    if (response && response.length) {
      glLabels = response;
      log.debug(`-> have gl labels ${ghRepo.name}`);
      //console.log(ghOpts);
      ghLabels = await request(ghOpts);
      const newLabels = [];

      log.debug(`-] have gh labels ${ghRepo.name}`);
      // now have all the labels for this repo.
      for (const glLabel of glLabels) {
        //console.log(`gllbael:`, glLabel);
        const found = ghLabels.find(element => {
          //console.log(`ghlabel: `, element);
          return element.name === glLabel.name;
        });

        //  log.debug(`found: ${found}`);

        if (!found) {
          log.debug(`- new label called ${glLabel.name} for ${ghRepo.name}, adding`);
          ghOpts.method = `POST`;
          ghOpts.url    = ghBaseURL + `repos/${settings.github.org}/${ghRepo.name}/labels`;
          ghOpts.body   = {
            name: glLabel.name,
            color: glLabel.color.replace(/\#/, ``)
          };
          //  console.log(ghOpts);
          newLabels.push(await request(ghOpts));
        }
      }
      log.debug(`labels added for ${ghRepo.name}`);
      return newLabels;
    } else {
      log.debug(`no labels to add to ${ghRepo.name}, skipping`);
      return false;
    }
  } catch (err) {
    log.error(`_labels failed for ${ghRepo.name}`);
    throw err;
  }
}

/**
 * Create milestone for github repo, match details to gitlab milestone
 * @method _createMilestone
 * @param {Object} ghRepo target repo
 * @param {Object} ms milestone to create
 * @return {Object} new milestone
 * @throws request error
 * @private
 */
async function _createMilestone(ghRepo: Object, ms: Object): Object {
  try {
    log.debug(`- _createMilestone: ${ms.title}`);
    const options = _clone(gitHubOpts);
    options.url += `repos/${settings.github.org}/${ghRepo.name}/milestones`;
    options.method = `POST`;
    options.body   = {
      title: ms.title,
      description: ms.description,
      state: ms.state !== `closed` ? `open` : `closed`
    };
    if (ms.due_date) {
      options.body.due_on = moment(ms.due_date).toISOString();
    }

    const response = await request(options);
    response.gitLabId = ms.id;
    log.debug(`- milestone created!`);
    return response;
  } catch (err) {
    log.error(`_createMilestone failed for "${options.title}"`);
    throw err;
  }
}

/**
 * Create all milestones in github for gitlab repo
 * @method _milestones
 * @param {Object} ghRepo github repo
 * @param {Object} glRepo gitlab repo
 * @return {Promise}
 * @private
 */
async function _milestones(ghRepo: Object, glRepo: Object): Object {
  // get milestones for glr
  // for each MS
  // - create new gh MS
  // - map response id to gl MS
  // hand mapped ms to resolve
  try {
    log.debug(`_milestones: ${ghRepo.name}`);
    const options = _clone(gitLabOpts);
    options.url += `projects/${glRepo.id}/milestones?sort=asc`;
    const glMilestones = await request(options);
    glMilestones.sort((a, b) => {
      return a.iid - b.iid;
    });
    const newMilestones = [];

    for (const ms of glMilestones) {
      newMilestones.push(await _createMilestone(ghRepo, ms));
    }

    return newMilestones;
  } catch (err) {
    log.error(`_milestones failed`);
    throw err;
  }
}
/**
 * Map from gitlab user name to github
 * @method _mapUser
 * @param {string} user gitlab user name
 * @return {string} github user name or gurrent github user if not found
 * @private
 */
function _mapUser(user: string): string {
  let ghUser = null;
  if (user) {
    ghUser = settings.mapping[user];
  }
  return ghUser || settings.github.user;
}

/**
 * Update github issue with correct state
 * @method _updateIssue
 * @param {object} ghRepo target repo
 * @param {object} glIssue source issue
 * @param {object} ghIssue github issue to update
 * @return {object} updated issue
 */
async function _updateIssue(ghRepo: Object, glIssue: Object, ghIssue: Object): Object {
  try {
    log.debug(`_updateIssue: `, glIssue.title, glIssue.iid);
    const options = _clone(gitHubOpts);
    options.url += `repos/${settings.github.org}/${ghRepo.name}/issues/${ghIssue.number}`;
    options.method = `PATCH`;
    options.body   = {
      state: glIssue.state !== `closed` ? `open` : `closed`
    };

    sleep();
    const response = await request(options);

    return response;
  } catch (err) {
    log.error(`_updateIssue failed for ${glIssue.title}, ${glIssue.iid}`);
    throw err;
  }
}

/**
 * Create issue and comments for specific repo
 * @method _createIssue
 * @param {Object} ghRepo target repo
 * @param {Object} issue gitlab issue
 * @param {Array.<object>} milestones known milestones for project
 * @return {Promise}
 * @private
 */
async function _createIssueAndComments(ghRepo: Object, issue: Object, milestones: Object[]): Object {
  try {
    //  return new Promise((resolve, reject) => {
    log.debug(`_createIssueAndComments: `, issue.title, issue.iid);
    const options = _clone(gitHubOpts);
    options.url += `repos/${settings.github.org}/${ghRepo.name}/issues`;
    options.method = `POST`;
    options.body   = {
      title: issue.title,
      body: issue.body,
      labels: issue.labels,
      assignees: issue.assignee ? [_mapUser(issue.assignee.username)] : []
    };

    // if issue was part of milestone, get corresponding github milestone number
    if (issue.milestone) {
      const ms = milestones.find(element => {
        return element.gitLabId === issue.milestone.id;
      });
      if (ms) {
        options.body.milestone = ms.number;
      }

    //console.log(`- create this issue issue.ms: ${issue.milestone.iid} vs. ${options.body.milestone}`);
    }

    sleep();
    let response = await request(options);
    log.debug(`- new issue ${response.number} vs ${issue.iid}, state:${issue.state}`);
    response          = await _updateIssue(ghRepo, issue, response);
    response.gitLabId = issue.id;
    log.debug(`- update issue ${response.id}/${response.number} created`);
    response = await _comments(ghRepo, response);
    return response;
  } catch (err) {
    log.error(`_createIssueAndComments failed for ${issue.title}, ${issue.iid}`);
    throw err;
  }
}

/**
 * Blocking sleep function :(
 * @method sleep
 * @param {Number} [ms=4000] number of milliseconds to sleep for
 * @private
 */
function sleep(ms : number = 1100) {
  const waitTimeInMilliseconds = new Date().getTime() + ms;
  while (new Date().getTime() < waitTimeInMilliseconds) {
    true;
  }
}

/**
 * Handle creationg of issues and comments for this repo
 * @method _issuesAndComments
 * @param {Object} ghRepo target github repo
 * @param {Object} glRepo source gitlab repo
 * @param {Object} milestones known milestones for project
 * @return {Promise}
 */
async function _issuesAndComments(ghRepo: Object, glRepo: Object, milestones: Object[]): Array<Object> {
  try {
    // get issues
    // for each issue, get comments
    // - create new issue, map MS if set
    // - on response, create new comment(s)
    log.debug(`_issuesAndComments: ${ghRepo.name}`);
    const options = _clone(gitLabOpts);
    options.url += `projects/${glRepo.id}/issues?per_page=100&sort=asc`;
    let glIssues = await request(options);
    options.url += `&page=2`;
    glIssues = glIssues.concat(await request(options));
    glIssues.sort((a, b) => {
      return a.iid - b.iid;
    });
    const newIssues = [];
    log.warn(`Number of gitlab issues: ${glIssues.length}`);
    //console.log(`issues: `, glIssues)
    for (const issue of glIssues) {
      newIssues.push(await _createIssueAndComments(ghRepo, issue, milestones));
    }

    return newIssues;
  } catch (err) {
    log.error(`_issuesAndComments failed for repo: ${glRepo.name}`);
    throw err;
  }
}

/**
 * Create comment on github issue from gitlab source
 * @method _createComment
 * @param {Object} ghRepo target repo
 * @param {Object} issue github issue to comment on
 * @param {Object} comment new comment
 * @return {Promise}
 * @private
 */
async function _createComment(ghRepo: Object, issue: Object, comment: Object): Object {
  try {
    log.debug(`_createComment on ${issue.number} "${comment.body}"`);
    const options = _clone(gitHubOpts);
    options.url += `repos/${settings.github.org}/${ghRepo.name}/issues/${issue.number}/comments`;
    options.method = `POST`;
    options.body   = {
      body: comment.body
    };

    sleep();
    const response = await request(options);

    response.gitLabId = comment.id;
    //console.log(`new comment`, response);
    log.debug(`new comment ${response.id} for issue ${issue.number} created`);
    return response;
  } catch (err) {
    log.error(`_createComment failed for ${ghRepo.name} issue: ${issue.number}: "${options.body.body}"`);
    throw err;
  }
}

/**
 * Handle creation of comments for target repo
 * @method _comments
 * @param {Object} ghRepo targetrepo
 * @param {Object} issue github issue
 * @return {Array.<Object>}
 * @private
 */
async function _comments(ghRepo: Object, issue: Object): Array[Object] {
  try {
    log.debug(`_comments: ${ghRepo.name}`);
    const options = _clone(gitLabOpts);
    options.url += `projects/${ghRepo.gitLabId}/issues/${issue.gitLabId}/notes?sort=asc`;

    sleep();
    const response    = await request(options);
    const newComments = [];
    for (const comment of response) {
      newComments.push(await _createComment(ghRepo, issue, comment));
    }

    return newComments;
  } catch (err) {
    log.error(`_comments failed:`, err);
    throw err;
  }
}

/**
 * Migrate labels, milestones, issues and comments from gitlab to github for this repo.
 * @method _migrate
 * @param {object} repo github repo
 * @return {Promise}
 * @private
 */
async function _migrate(repo) {
  //  - find corresponding glRepo
  //   - get glLabels
  //   - get ghLabels
  //
  //   - for each glLabel
  //    - if glLabel not in ghLabels
  //     - add ghLabel
  try {
    log.info(`_migrate ${repo.name}`);

    const glr = gitLabRepos.find(element => {
      return element.name === repo.name;
    });

    if (!glr) {
      return (`no corresponding repo found on gitlab, skipping...`);
    } else {
      repo.gitLabId = glr.id;
      const msg = await _labels(repo, glr);
      log.debug(msg);
      const newMilestones = await _milestones(repo, glr);
      log.debug(`newMilestones:`, newMilestones);
      await _issuesAndComments(repo, glr, newMilestones);
      log.info(`migration of ${repo.name} complete`);
      return; // `migration of ${repo.name} complete`;
    }
  } catch (err) {
    log.error(`_migrate ${repo.name} failed`);
    throw err;
  }
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
  const ghopts  = _clone(gitHubOpts);
  const baseURL = ghopts.url;
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
          }), 2000);
      })
      .then(() => {
        resolve(`import of ${project} complete`);
      })
      .catch(function(err) {
        reject(err);
      });
  });
}

/**
 * Fetch and cache known repos.
 * @method _fetch
 * @return {Promise}
 * @private
 */
async function _fetch() {
  log.debug(`fetch known repos`);
  if (gitLabRepos && gitHubRepos) {
    return (`already fetched`);
  }
  try {
    gitLabRepos = await _getRepos();
    gitHubRepos = await _getRepos(false);
    return `fetched`;
  } catch (err) {
    throw new Error(`fetch failed`);
  }
}

/**
 * Get known repos for either gitlab or github
 * @method _getRepos
 * @param {Boolean} [isGitlab=true] if true, fetch from gitlab, else from github
 * @return {Promise}
 * @private
 */
async function _getRepos(isGitlab = true) {
  const options = isGitlab ? _clone(gitLabOpts) : _clone(gitHubOpts);
  options.url += isGitlab ? `projects?per_page=100` : `orgs/${settings.github.org}/repos?per_page=100&now=${moment().unix()}`;

  try {
    const repos = await request(options);
    return repos;
  } catch (err) {
    throw new Error(err);
  }
}

/**
 * Import single project from gitlab into github.
 * @method importer
 * @see {@link _import}
 * @param {string} project name of project to import
 */
export function importer(project :string) {
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
 * List known gitlab and github repos
 * @method projects
 */
export function list() {
  _fetch()
    .then(status => {
      log.debug(`repos fetched`);
      log.info(`GitLab repos (${gitLabRepos.length}):`);
      for (const repo of gitLabRepos) {
        log.info(`=> ${repo.id}:${repo.name}:${repo.web_url}`);
      }
      log.info(`--------`);
      log.info(`GitHub repos (${gitHubRepos.length}):`);
      for (const repo of gitHubRepos) {
        log.info(`=> ${repo.id}:${repo.name}:${repo.url}`);
      }
    })
    .catch(err => {
      log.error(err);
    });
}

/**
 * Handle importing of all repos from gitlab to github.
 * @method _importAll
 * @private
 */
async function _importAll() {
  try {
    for (const repo of gitLabRepos) {
      log.debug(`=> ${repo.id}:${repo.name}:${repo.description}:${repo.web_url}`);
      await _import(repo.name);
    }

    log.info(`import all complete`);
    return;
  } catch (err) {
    throw err;
  }
}

/**
 * Import all gitlab repos to github
 * @method importAll
 */
export function importAll() {
  _fetch()
    .then(status => {
      log.debug(`importAll fetch: ${status}`);
      return _importAll();
    })
    .catch(err => {
      log.error(`importAll failed: `, err);
    });
}

/**
 * Remove named repo from github
 * @method remove
 * @param {string} project to remove
 */
export function remove(project: string) {
  const options = _clone(gitHubOpts);
  options.method = `DELETE`;
  options.url += `repos/${settings.github.org}/${project}`;
  request(options)
    .then(response => {
      log.info(`${project} removed`);
    })
    .catch(err => {
      log.error(err);
    });
}

/**
 * Handle migration of all repos from gitlab to github
 * @method _migrateAll
 * @private
 */
async function _migrateAll() {
  try {
    for (const repo of gitHubRepos) {
      await _migrate(repo);
    }

    log.info(`_migrateAll complete`);
    return;
  } catch (err) {
    log.error(`_migrateAll: bang!`);
    throw err;
  }
}

/**
 * Migrate all known github projects from gitlab.
 * Milestones, labels, issues and comments
 * @method migrateAll
 */
export function migrateAll() {
  _fetch()
    .then(status => {
      log.debug(`migrate all fetch: ${status}`);
      return _migrateAll();
    })
    .catch(err => {
      log.error(`migrate all bang`);
      log.error(err);
    });
}

/**
 * Migrate labels, milestones, issues and comments for specified repo from gitlab into github.
 * @method migrate
 * @param {string} project to migrate
 */
export function migrate(project: string) {
  _fetch()
    .then(status => {
      log.debug(`migrate fetch: ${status}`);
      const ghRepo = gitHubRepos.find(element => {
        return element.name === project;
      });

      if (ghRepo) {
        return _migrate(ghRepo);
      }
      throw new Error(`unknown repo ${project}`);
    })
    .catch(err => {
      log.error(`migrate bang`);
      log.error(err);
    });
}
