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
const Bundler = require('../lib/Bundler');

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

const bundler = new Bundler();
bundler.debug = parseBool(commander.debug);

const command = new TestCommand();

command.version = packageJson.version;
command.debug = parseBool(commander.debug);
command.impTestFile = impTestFile;
command.buildAPIClient = buildAPIClient;
command.testFrameworkFile = __dirname + '/../impUnit/bundle.nut';
command.testCaseFile = commander.args[0] || null;
command.bundler = bundler;

// go
command.tryRun();
