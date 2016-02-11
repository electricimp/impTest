'use strict';

var ImpTestFile = require('../ImpTestFile');
var colors = require('colors');
var dateformat = require('dateformat');
var sprintf = require('sprintf-js').sprintf;

class AbstractCommand {

  /**
   * Run command with error handling and exit.
   * Sets the return code to 1 in  case of error.
   */
  tryRun() {

    try {
      this.run()
        .then(() => this.finish())
        .catch((error) => {
          throw error;
        });
    } catch (e) {
      this._success = false;
      this._error(e);
      this.finish();
    }

  }

  /**
   * Default options
   * @returns {{}}
   */
  get defaultOptions() {
    return {
      debug: false,
      config: '.imptest',
      version: null
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
    this._success = true;
    this.options = options;
    this._info('impTest/' + this._options.version);
    this._logStartDate = this._logDate = null;
    this._info(colors.blue('Started at ') + dateformat(new Date(), 'dd mmm yyyy HH:MM:ss Z'));
  }

  /**
   * Run command
   *
   * @return {Promise}
   */
  run() {
    return new Promise((resolve, reject) => {
      this._debug(colors.blue('Using options:'), this._options);

      this.buildAPIClient.apiKey = this.impTestFile.values.apiKey;

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
   * Debug print
   * @param {*} ...objects
   * @protected
   */
  _debug() {
    if (this.debug) {
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
   * @param {*|Error} error
   * @protected
   */
  _error(error) {
    if (error instanceof Error) {
      error = error.message;
    }

    this._log('error', colors.red, [colors.red(error)]);
  }

  /**
   * Log message
   * @param {string} type
   * @param {[*]} params
   * @private
   */
  _log(type, colorFn, params) {

    let dateMessage = '';

    if (type === 'debug') {
      type += ':' + this.constructor.name;
    } else {
      const now = new Date();
      //dateMessage = dateformat(now, 'HH:MM:ss.l');

      if (this._logDate && this._logStartDate) {
        let dif1 = (now - this._logStartDate) / 1000;
        let dif2 = (now - this._logDate) / 1000;
        dif1 = sprintf('%.2f', dif1);
        dif2 = sprintf('%.2f', dif2);
        dateMessage += '+' + dif1 + '/' + dif2 + 's ';
      } else {
        this._logStartDate = now;
      }

      this._logDate = now;
    }

    // convert params to true array (from arguments)
    params = Array.prototype.slice.call(params);
    params.unshift(colorFn('[' + dateMessage + type + ']'));
    console.log.apply(this, params);
  }

  // <editor-fold desc="Accessors" defaultstate="collapsed">

  set buildAPIClient(value) {
    this._buildAPIClient = value;
  }

  get buildAPIClient() {
    return this._buildAPIClient;
  }

  set impTestFile(value) {
    this._impTestFile = value;
  }

  get impTestFile() {
    return this._impTestFile;
  }

  get debug() {
    return this._debug;
  }

  set debug(value) {
    this._debug = value;
  }

  // </editor-fold>
}

module.exports = AbstractCommand;
