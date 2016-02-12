'use strict';

const colors = require('colors');
const dateformat = require('dateformat');
const sprintf = require('sprintf-js').sprintf;

class AbstractCommand {

  constructor() {
    this._success = true;
  }

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
   * Run command
   *
   * @return {Promise}
   */
  run() {
    return new Promise((resolve, reject) => {
      this._info('impTest/' + this.version);
      this._info(colors.blue('Started at ') + dateformat(new Date(), 'dd mmm yyyy HH:MM:ss Z'));
      this._logStartDate = this._logDate = null;

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
    return this.__debug;
  }

  set debug(value) {
    this.__debug = value;
  }

  get version() {
    return this._version;
  }

  set version(value) {
    this._version = value;
  }

// </editor-fold>
}

module.exports = AbstractCommand;
