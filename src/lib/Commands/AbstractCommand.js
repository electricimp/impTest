/**
 * Command base
 *
 * @author Mikhail Yurasov <mikhail@electricimp.com>
 */


'use strict';

const colors = require('colors');
const DebugMixin = require('../DebugMixin');
const ImpTestFile = require('../ImpTestFile');
const BuildAPIClient = require('../../BuildAPIClient');

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
   * Run command with error handling and exit.
   * Sets the return code to 1 in  case of error.
   */
  run() {
    this._run()
      .catch((error) => {
        this._onError(error);
      })
      .then(() => {
        this.finish();
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

    if (this._success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
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

  get logTiming() {
    return this._logTiming;
  }

  set logTiming(value) {
    this._logTiming = value;
  }

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
