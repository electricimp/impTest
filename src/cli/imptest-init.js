/**
 * Init command
 */

'use strict';

const commander = require('commander');
const packageJson = require('../../package.json');
const parseBool = require('../lib/utils/parseBool');
const BuildAPIClient = require('../lib/BuildAPIClient');
const InitCommand = require('../lib/Commands/InitCommand');

commander
  .option('-d, --debug', 'debug output')
  .option('-c, --config [path]', 'config file path [default: .imptest]', '.imptest')
  .option('-f, --force', 'overwrite existing configuration')
  .parse(process.argv);

// bootstrap command

const buildAPIClient = new BuildAPIClient();
buildAPIClient.debug = parseBool(commander.debug);

const command = new InitCommand();

command.debug = parseBool(commander.debug);
command.buildAPIClient = buildAPIClient;
command.force = parseBool(commander.force);
command.version = packageJson.version;
command.configPath = commander.config;

// go
command.tryRun();
