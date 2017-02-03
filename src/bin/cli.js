#!/usr/bin/env node
'use strict';
import "babel-polyfill";

import commander from 'commander';
import * as migrate from '../lib/migrate';
import log from '../lib/logger';
import {version} from '../../package.json';

// ====================================
// main
log.info(`Gitlab to GitHub migration tool  %s!`, version);

commander
  .version(version)
  .option(`-A, --all`, `import all know repos`)
  .option(`-a, --authors [value]`, `map authors`)
  .option(`-D, --debug`, `enable debug messages`)
  .option(`-i, --import [value]`, `import named repo from gitlab into github`)
  .option(`-l, --list`, `list know repos`)
  .option(`-l, --list`, `list know repos`)
  .option(`-m, --migrate`, `migrate labels/issues/comments for all repos`)
  .option(`-p, --projects`, `list known remote projects`)
  .option(`-R, --remove [value]`, `remove named repo from github`)
  .option(`-r, --repo [value]`, `migrate labels/issues/comments for all specific repo`);


commander.on(`--help`, function() {
  console.log(`Examples:

    // migrate foobar repo
    $ skeletor -r foobar
  `);
});

commander.parse(process.argv);

if (commander.debug) {
  log.transports.console.level = `debug`;
}

if (commander.list) {
  migrate.list();
} else if (commander.remove) {
  migrate.remove(commander.remove);
} else if (commander.import) {
  migrate.importer(commander.import);
} else if (commander.authors) {
  migrate.authors(commander.authors);
} else if (commander.all) {
  migrate.importAll();
} else if (commander.migrate) {
  migrate.migrate();
} else if (commander.projects) {
  migrate.projects();
} else {
  commander.outputHelp();
}
