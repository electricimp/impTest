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
    options.testCaseFile && (command.testCaseFile = __dirname + options.testCaseFile);

    console.log(c.inverse('======== command start ========'));

    let out = '';

    // intercept stdout
    const unHook = interceptStdout(txt => {
      out += txt;
    });

    const onDone = (success) => {
      unHook();
      console.log(c.inverse('========= command end ========='));
      out = utils.clearAnsiColors(out);
      resolve({success, out});
    };

    // run command
    command.run().then(() => onDone(true), () => onDone(false));

  });
}

module.exports = run;
