'use strict';

const colors = require('colors');
const dateformat = require('dateformat');
const DebugMixin = require('../DebugMixin');
const sprintf = require('sprintf-js').sprintf;

class AbstractCommand {

  constructor() {
    DebugMixin.call(this);
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
      this.logTiming = true; // enable log timing
      this._info(colors.blue('Started at ') + dateformat(new Date(), 'dd mmm yyyy HH:MM:ss Z'));

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

    if (this.logTiming) {
      const now = new Date();
      //dateMessage = dateformat(now, 'HH:MM:ss.l');

      if (this._lastLogDate && this._logStartDate) {
        let dif1 = (now - this._logStartDate) / 1000;
        let dif2 = (now - this._lastLogDate) / 1000;
        dif1 = sprintf('%.2f', dif1);
        dif2 = sprintf('%.2f', dif2);
        dateMessage += '+' + dif1 + '/' + dif2 + 's ';
      } else {
        this._logStartDate = now;
      }

      this._lastLogDate = now;
    }

    // convert params to true array (from arguments)
    params = Array.prototype.slice.call(params);
    params.unshift(colorFn('[' + dateMessage + type + ']'));
    console.log.apply(this, params);
  }

  // <editor-fold desc="Accessors" defaultstate="collapsed">

  get logTiming() {
    return this._logTiming;
  }

  set logTiming(value) {
    this._logTiming = value;
  }

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

  get version() {
    return this._version;
  }

  set version(value) {
    this._version = value;
  }

// </editor-fold>
}

module.exports = AbstractCommand;
