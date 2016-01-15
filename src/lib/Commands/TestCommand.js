/**
 * Test command
 */

'use strict';

var fs = require('fs');
var path = require('path');
var colors = require('colors');
var AbstractCommand = require('./AbstractCommand');
var BuildAPIClient = require('../BuildAPIClient');

class TestCommand extends AbstractCommand {

  /**
   * @returns {{}}
   */
  get defaultOptions() {
    return {
      debug: false,
      config: '.imptest',
      agent: true,
      device: true,
      testFrameworkFile: '' // path to test framework main file
    };
  }

  /**
   * Run command
   */
  run() {
    super.run();
    this._runTest();
  }

  /**
   * @returns {BuildAPIClient}
   * @private
   */
  _createBuildApiClient() {
    return new BuildAPIClient({
      debug: this._options.debug,
      apiKey: this._config.values.apiKey
    });
  }

  /**
   * Read agent/device source code
   * @private
   */
  _readCode() {
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

  /**
   * Run test
   * @private
   */
  _runTest() {

    this._readCode();

    // todo: combine code with test framework
    // todo: reporting of the test progress

    const client = this._createBuildApiClient();
    let revision; // current revision

    client.createRevision(this._config.values.modelId, this._deviceCode, this._agentCode)

      .then((body) => {
        revision = body.revision;
        return client.restartModel(this._config.values.modelId);
      })

      .then(() => {
        // get logs since current revision was created
        return client.getDeviceLogs(this._config.values.devices[0], revision.created_at);
      })

      .catch((error) => {
        console.log(error);
      });

  }

}

module.exports = TestCommand;
