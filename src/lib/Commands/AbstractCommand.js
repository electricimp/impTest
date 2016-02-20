'use strict';

const colors = require('colors');
const dateformat = require('dateformat');
const DebugMixin = require('../DebugMixin');
const sprintf = require('sprintf-js').sprintf;
const ImpTestFile = require('../ImpTestFile');
const BuildAPIClient = require('../BuildAPIClient');

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
      // startup message
      this._info('impTest/' + this.version);
      this.logTiming = true; // enable log timing
      this._info(colors.blue('Started at ') + dateformat(new Date(), 'dd mmm yyyy HH:MM:ss Z'));

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
    this._buildAPIClient.apiKey = this._impTestFile.values.apiKey;
    this._buildAPIClient.debug = this.debug;
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

  /**
   * Error handler
   * @param {Error|*} error
   * @protected
   */
  _onError(error) {
    this._success = false;
    this._error(colors.red(error));
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
