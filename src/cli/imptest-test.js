/**
 * Test command
 * 
 * @author Mikhail Yurasov <mikhail@electricimp.com>
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

// bootstrap command

const command = new TestCommand();

command.version = packageJson.version;
command.debug = parseBool(commander.debug);
command.testFrameworkFile = __dirname + '/../impUnit/index.nut';
command.testCaseFile = commander.args[0] || null;
command.configPath = commander.config;

// go
command.run()
  .then(() => {
    process.exit(0);
  }, () => {
    process.exit(1);
  });
