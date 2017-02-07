#!/usr/bin/env node
'use strict';
import "babel-polyfill";

import commander from 'commander';
import * as migrate from '../lib/migrate';
import log from '../lib/logger';
import {version} from '../../package.json';
process.env.UV_THREADPOOL_SIZE = 128;
// ====================================
// main
log.info(`Gitlab to GitHub migration tool  %s!`, version);

commander
  .version(version)
  .option(`-D, --debug`, `enable debug messages`)
  .option(`-i, --import [value]`, `import named repo from gitlab into github`)
  .option(`-I, --importAll`, `import all know repos`)
  .option(`-l, --list`, `list known repos (gitlab and github)`)
  .option(`-m, --migrate [value]`, `migrate labels/issues/comments for all specific repo`)
  .option(`-M, --migrateAll`, `migrate labels/issues/comments for all repos`)
  .option(`-R, --remove [value]`, `remove named repo from github`);

commander.on(`--help`, function() {
  console.log(`Examples:

    // import foobar repo
    $ ma-migrate --import foobar
    $ ma-migrate --migrate foobar
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
} else if (commander.importAll) {
  migrate.importAll();
} else if (commander.migrateAll) {
  migrate.migrateAll();
} else if (commander.migrate) {
  migrate.migrate(commander.migrate);
} else if (commander.list) {
  migrate.list();
} else {
  commander.outputHelp();
}
