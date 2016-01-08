/**
 * Init command
 */

'use strict';

var commander = require('commander');
var InitCommand = require('../lib/Commands/InitCommand');
var parseBool = require('../lib/utils/parseBool');

commander
  .option('-d, --debug', 'debug output')
  .option('-c, --config [path]', 'config file path [default: .imptest]', '.imptest')
  .option('-f, --force', 'overwrite existing configuration')
  .parse(process.argv);

// run command
(new InitCommand({
  debug: parseBool(commander.debug),
  force: parseBool(commander.force),
  config: commander.config
})).run();
