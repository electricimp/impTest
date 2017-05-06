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
 * Command base
 */


'use strict';

const colors = require('colors');
const DebugMixin = require('../DebugMixin');
const ImpTestFile = require('../ImpTestFile');
const BuildAPIClient = require('imp-build-api-v4');

/**
 * Name for BuildAPI key env var
 */
const BUILD_API_KEY_ENV_VAR = 'IMP_BUILD_API_KEY';

class AbstractCommand {

  constructor() {
    DebugMixin.call(this);
    this._success = true;
  }

  /**
   * Run command with error handling
   * @return {Promise}
   */
  run() {
    return new Promise((resolve, reject) => {
      this._run()
        .catch((error) => {
          this._onError(error);
        })
        .then(() => {
          this.finish();
          this._success ? resolve() : reject();
        });
    });
  }

  /**
   * Run command
   * @return {Promise}
   * @protected
   */
  _run() {
    return new Promise((resolve, reject) => {
      // initlization
      this._init();

      resolve();
    });
  }

  /**
   * Finish command
   */
  finish() {
    this._debug(colors.blue('Command success: ') + this._success);
  }

  /**
   * Initialize before run()
   * @protected
   */
  _init() {
    // config file
    this._impTestFile = new ImpTestFile(this.configPath);
    this._impTestFile.debug = this.debug;

    // build api client
    this._buildAPIClient = new BuildAPIClient();
    this._buildAPIClient.apiKey = this._impTestFile.values.apiKey || process.env[BUILD_API_KEY_ENV_VAR];
    this._buildAPIClient.debug = this.debug;
  }

  /**
   * Log message
   * @param {string} message
   * @protected
   */
  _log() {
    console.log.apply(this, arguments);
  }

  _info() {
    return this._log.apply(this, arguments);
  }

  _error(message) {
    return this._log(colors.red(message));
  }

  /**
   * Print blank line
   * @protected
   */
  _blank() {
    console.log('');
  }

  /**
   * Error handler
   * @param {Error|*} error
   * @protected
   */
  _onError(error) {
    this._error(error);
    this._success = false;
  }

  // <editor-fold desc="Accessors" defaultstate="collapsed">

  get version() {
    return this._version;
  }

  set version(value) {
    this._version = value;
  }

  get configPath() {
    return this._configPath;
  }

  set configPath(value) {
    this._configPath = value;
  }

  // </editor-fold>
}

module.exports = AbstractCommand;
