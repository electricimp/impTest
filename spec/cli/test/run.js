/**
 * Runs test command with options
 */

'use strict';

const c = require('colors');
const utils = require('../../utils');
const interceptStdout = require('intercept-stdout');
const packageJson = require('../../../package.json');
const TestCommand = require('../../../src/lib/Commands/TestCommand');

function run(options) {

  return new Promise((resolve, reject) => {

    // create command
    const command = new TestCommand();
    command.version = packageJson.version;
    command.debug = false;
    command.testFrameworkFile = __dirname + '/../../../src/impUnit/index.nut';
    // todo: update device/model from tests config or use single config
    command.configPath = __dirname + options.configPath;

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
