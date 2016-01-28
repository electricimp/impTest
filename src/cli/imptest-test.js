/**
 * Test command
 */

'use strict';

var commander = require('commander');
var TestCommand = require('../lib/Commands/TestCommand');
var parseBool = require('../lib/utils/parseBool');
var packageJson = require('../../package.json');

commander
  .usage('[options] <test case file>')
  .option('-d, --debug', 'debug output')
  .option('-c, --config [path]', 'config file path [default: .imptest]', '.imptest')
  .parse(process.argv);

// run command
(new TestCommand({
  debug: parseBool(commander.debug),
  config: commander.config,
  agent: parseBool(commander.agent),
  device: parseBool(commander.imp),
  testFrameworkFile: __dirname + '/../impunit/impUnit.nut',
  testCaseFile: commander.args[0] || null,
  version: packageJson.version
})).tryRun();
