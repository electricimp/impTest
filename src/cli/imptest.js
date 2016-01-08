#! /usr/bin/env node

/**
 * CLI app
 */

'use strict';

var commander = require('commander');

commander
  .command('init', 'Initialize .impconfig file')
  .command('test', 'Run tests')
  .parse(process.argv);

