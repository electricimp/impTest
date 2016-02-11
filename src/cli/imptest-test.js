/**
 * Test command
 */

'use strict';

const commander = require('commander');
const packageJson = require('../../package.json');
const parseBool = require('../lib/utils/parseBool');
const TestCommand = require('../lib/Commands/TestCommand');
const BuildAPIClient = require('../lib/BuildAPIClient');
const ImpTestFile = require('../lib/ImpTestFile');

commander
  .usage('[options] <test case file>')
  .option('-d, --debug', 'debug output')
  .option('-c, --config [path]', 'config file path [default: .imptest]', '.imptest')
  .parse(process.argv);

// bootstrap command

const buildAPIClient = new BuildAPIClient();
buildAPIClient.debug = parseBool(commander.debug);

const impTestFile = new ImpTestFile(commander.config);
impTestFile.debug = parseBool(commander.debug);

const command = new TestCommand({
  debug: parseBool(commander.debug),
  config: commander.config,
  testFrameworkFile: __dirname + '/../impUnit/bundle.nut',
  testCaseFile: commander.args[0] || null,
  version: packageJson.version
});

command.buildAPIClient = buildAPIClient;
command.impTestFile = impTestFile;

// go
command.tryRun();
