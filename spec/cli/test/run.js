/**
 * Runs test command with options
 */

'use strict';

const fs = require('fs');
const c = require('colors');
const utils = require('../../utils');
const config = require('../../support/config');
const interceptStdout = require('intercept-stdout');
const packageJson = require('../../../package.json');
const TestCommand = require('../../../src/lib/Commands/TestCommand');

/**
 * Create temporary .imptest file with config settings applied
 * @param {string} path
 * @return {string}
 */
function createTmpImpTestFile(path) {
  let s = fs.readFileSync(path, 'utf-8');
  s = s.replace('<modelId>', config.cli.modelId);
  s = s.replace('<deviceIds>', JSON.stringify(config.cli.deviceIds));
  path += '.tmp';
  fs.writeFileSync(path, s, 'utf-8');
  return path;
}

/**
 * Run command
 * @param options
 * @return {Promise}
 */
function run(options) {

  return new Promise((resolve, reject) => {

    // create command
    const command = new TestCommand();
    command.version = packageJson.version;
    command.debug = false;
    command.testFrameworkFile = __dirname + '/../../../src/impUnit/index.nut';
    // todo: update device/model from tests config or use single config
    command.configPath = createTmpImpTestFile(__dirname + options.configPath);

    // optional options
    options.testCaseFile !== undefined && (command.testCaseFile = __dirname + options.testCaseFile);
    options.startupDelay !== undefined && (command.startupDelay = options.startupDelay);
    options.extraTestTimeout !== undefined && (command.extraTestTimeout = options.extraTestTimeout);
    options.sessionStartTimeout !== undefined && (command.sessionStartTimeout = options.sessionStartTimeout);

    console.log(c.inverse('<command>'));

    let out = '';

    // intercept stdout
    const unHook = interceptStdout(txt => {
      out += txt;
    });

    const onDone = (success) => {
      fs.unlinkSync(command.configPath); // delete temporarry config
      unHook();
      console.log(c.inverse('</command>'));
      out = utils.clearAnsiColors(out);
      resolve({success, out});
    };

    // run command
    command.run().then(() => onDone(true), () => onDone(false));

  });
}

module.exports = run;
