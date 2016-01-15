'use strict';

var ConfigFile = require('../ConfigFile');
var colors = require('colors');

class AbstractCommand {

  /**
   * Default options
   * @returns {{}}
   */
  get defaultOptions() {
    return {
      debug: false,
      config: '.imptest'
    };
  }

  /**
   * @param {{}} val
   */
  set options(val) {
    // mix default options with val
    this._options = Object.assign(
      this._options || this.defaultOptions,
      val
    );
  }

  /**
   * @param {{}} options
   */
  constructor(options) {
    this.options = options;
  }

  /**
   * Run command
   */
  run() {
    this._debug(
      colors.blue('Using options:'),
      this._options
    );

    this._readConfig();
  }

  /**
   * Debug print
   * @param {*} ...objects
   * @protected
   */
  _debug() {
    if (this._options.debug) {
      this._log('debug', colors.green, arguments);
    }
  }

  /**
   * Log info message
   * @param {*} ...objects
   * @protected
   */
  _info() {
    this._log('info', colors.grey, arguments);
  }

  /**
   * Error message
   * @param {*} ...objects
   * @protected
   */
  _error() {
    this._log('error', colors.red, arguments);
  }

  /**
   * Log message
   * @param {string} type
   * @param {[*]} params
   * @private
   */
  _log(type, colorFn, params) {
    // convert params to true array (from arguments)
    params = Array.prototype.slice.call(params);
    params.unshift(colorFn('[' + type + ']'));
    console.log.apply(this, params);
  }

  /**
   * Read config file
   * @protected
   */
  _readConfig() {
    this._config = new ConfigFile(this._options.config);

    this._debug(colors.blue('Using config file:'), this._config.path);

    if (!this._config.exists()) {
      this._debug(colors.yellow('Config file not found'));
    }

    this._debug(colors.blue('Config:'), this._config.values);
  }
}

module.exports = AbstractCommand;
