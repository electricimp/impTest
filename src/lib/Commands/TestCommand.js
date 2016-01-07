/**
 * Test command
 */

'use strict';

var AbstractCommand = require('./AbstractCommand');
var fs = require('fs');
var path = require('path');
var colors = require('colors');

class TestCommand extends AbstractCommand {

  /**
   * @returns {{}}
   */
  get defaultOptions() {
    return {
      debug: false,
      config: '.imptest',
      agent: true,
      device: true
    };
  }

  /**
   * Run command
   */
  run() {
    super.run();
    this._runTest();
  }

  _runTest() {

    // read agent code
    if (this._options.agent && !!this._config.values.agentFile) {
      this._agentFilePath = path.resolve(this._config.values.agentFile);
      this._agentCode = fs.readFileSync(this._agentFilePath, 'utf8');
      this._debug(colors.blue('Using agent code file:'), this._agentFilePath);
    }

    // read device code
    if (this._options.device && !!this._config.values.deviceFile) {
      this._deviceFilePath = path.resolve(this._config.values.deviceFile);
      this._deviceCode = fs.readFileSync(this._deviceFilePath, 'utf8');
      this._debug(colors.blue('Using device code file:'), this._deviceFilePath);
    }

  }

}

module.exports = TestCommand;
