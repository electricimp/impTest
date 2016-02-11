/**
 * Test command
 */

'use strict';

const commander = require('commander');
const packageJson = require('../../package.json');
const parseBool = require('../lib/utils/parseBool');
const TestCommand = require('../lib/Commands/TestCommand');

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
  testFrameworkFile: __dirname + '/../impUnit/bundle.nut',
  testCaseFile: commander.args[0] || null,
  version: packageJson.version
})).tryRun();
