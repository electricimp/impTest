// MIT License
//
// Copyright 2016 Electric Imp
//
// SPDX-License-Identifier: MIT
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO
// EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
// OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
// ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.

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
  s = s.replace(/\"?\<modelId\>\"?/, JSON.stringify(config.cli.modelId));
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
    command.debug = config.cli.debug;
    command.testFrameworkFile = __dirname + '/../../../src/impUnit/index.nut';
    // todo: update device/model from tests config or use single config
    command.configPath = createTmpImpTestFile(__dirname + options.configPath);

    // optional options
    options.testCaseFile !== undefined && (command.testCaseFile = options.testCaseFile);
    options.startupDelay !== undefined && (command.startupDelay = options.startupDelay);
    options.extraTestTimeout !== undefined && (command.extraTestTimeout = options.extraTestTimeout);
    options.sessionStartTimeout !== undefined && (command.sessionStartTimeout = options.sessionStartTimeout);

    console.log(c.inverse('\n<command config="' + options.configPath + '">'));

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
