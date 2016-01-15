/**
 * Test command
 */

'use strict';

var commander = require('commander');
var TestCommand = require('../lib/Commands/TestCommand');
var parseBool = require('../lib/utils/parseBool');

commander
  .option('-d, --debug', 'debug output')
  .option('-c, --config [path]', 'config file path [default: .imptest]', '.imptest')
  .option('-a, --agent [bool]', 'push agent code [default: true]', true)
  .option('-i, --imp [bool]', 'push device code [default: true]', true)
  .parse(process.argv);

// run command
(new TestCommand({
  debug: parseBool(commander.debug),
  config: commander.config,
  agent: parseBool(commander.agent),
  device: parseBool(commander.imp),
  testFrameworkFile: __dirname + '/../impunit/impUnit.nut'
})).run();
