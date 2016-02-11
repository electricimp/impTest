/**
 * Init command
 */

'use strict';

const commander = require('commander');
const packageJson = require('../../package.json');
const parseBool = require('../lib/utils/parseBool');
const BuildAPIClient = require('../lib/BuildAPIClient');
const InitCommand = require('../lib/Commands/InitCommand');
const ImpTestFile = require('../lib/ImpTestFile');

commander
  .option('-d, --debug', 'debug output')
  .option('-c, --config [path]', 'config file path [default: .imptest]', '.imptest')
  .option('-f, --force', 'overwrite existing configuration')
  .parse(process.argv);

// bootstrap command

const buildAPIClient = new BuildAPIClient();
buildAPIClient.debug = parseBool(commander.debug);

const impTestFile = new ImpTestFile(commander.config);
impTestFile.debug = parseBool(commander.debug);

const command = new InitCommand({
  config: commander.config,
  testFrameworkFile: __dirname + '/../impUnit/bundle.nut',
  testCaseFile: commander.args[0] || null,
  version: packageJson.version
});

command.buildAPIClient = buildAPIClient;
command.impTestFile = impTestFile;

// go
command.tryRun();
