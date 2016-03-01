#! /usr/bin/env node

/**
 * impTest cli app
 *
 * @author Mikhail Yurasov <mikhail@electricimp.com>
 */

'use strict';

const commander = require('commander');
const packageJson = require('../../package.json');

commander
  .version(packageJson.version)
  .command('init', 'Initialize .impconfig file')
  .command('test', 'Run tests')
  .parse(process.argv);

