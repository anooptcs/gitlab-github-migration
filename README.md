# Migrate from gitlab to github

- uses gitlab &amp; github api
- read project details from gitlab:
  - repo
  - milestones
  - labels
  - issues
  - users
  - wiki
- inject into github, update users as necessary (mapping):
  - repos
  - labels
  - milestones
  - issues
  - wiki

## installation

- `git clone https://github.com/mtechaccess/gitlab-github-migration.git`
- `cd gitlab-github-migration`
- `npm install`
- `gulp build`
- `npm link` to make it globally accessible

## configuration

- copy `.settings.json` to `settings.json`
- edit `settings.json` as necessary

## usage

- `gitlab-github-migration --import <repo>` to import repo from gitlab to github
- `gitlab-github-migration --migrate <repo>` to migrate repo milestones/labels/issues/comments from gitlab to github.
- if you are feeling brave, you can run `gitlab-github-migration --importAll` followed by `gitlab-github-migration --migrateAll` to import and migrate all repos from gitlab to github.
  - this may exceed the github API call rate limit
- add `-D` or `--debug` to get extra info
