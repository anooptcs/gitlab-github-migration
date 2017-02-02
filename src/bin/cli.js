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
  .option(`-a, --all`, `migrate all know repos`)
  .option(`-D, --debug`, `enable debug messages`)
  .option(`-l, --list`, `list know repos`)
  .option(`-p, --projects`, `list known remote projects`)
  .option(`-l, --list`, `list know repos`)
  .option(`-r, --repo [value]`, `migrate specific repo`);


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
} else if (commander.projects) {
  migrate.projects();
} else {
  commander.outputHelp();
}
