#! /usr/bin/env node

/**
 * CLI app
 */

var commander = require('commander');
var packageJson = require(__dirname + '/../../package');

commander
  .command('init', 'Initialize .impconfig file')
  .command('test', 'Run tests')
  .parse(process.argv);

