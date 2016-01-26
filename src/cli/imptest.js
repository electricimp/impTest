#! /usr/bin/env node

/**
 * CLI app
 */

'use strict';

var commander = require('commander');
var packageJson = require('../../package.json');

commander
  .version(packageJson.version)
  .command('init', 'Initialize .impconfig file')
  .command('test', 'Run tests')
  .parse(process.argv);

