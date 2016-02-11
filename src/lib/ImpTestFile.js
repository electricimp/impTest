'use strict';

var path = require('path');
var fs = require('fs');
var stripJsonComments = require('strip-json-comments');
var colors = require('colors');

/**
 * Config file abstraction
 */
class ImpTestFile {

  /**
   * @param {string} configPath
   */
  constructor(configPath) {

    this._defaultValues = {
      apiKey: '',
      modelId: '',
      devices: [],
      agentFile: 'agent.nut',
      deviceFile: 'device.nut',
      stopOnFailure: false,
      timeout: 10,
      tests: ['*.test.nut', 'tests/**/*.test.nut']
    };

    this._path = path.resolve(configPath);
  }

  /**
   * @return {bool}
   */
  exists() {
    return fs.existsSync(this._path);
  }

  /**
   * Read values
   * @return {{}}
   * @private
   */
  _read() {
    let values = {};
    this._debug(colors.blue('Using config file:'), this.path);

    if (this.exists()) {
      values = fs.readFileSync(this.path).toString();
      values = stripJsonComments(values);
      values = JSON.parse(values);
      values = Object.assign(this._defaultValues, values);
      this._debug(colors.blue('Config values:'), values);
    } else {
      this._debug(colors.red('Config file not found'));
    }

    return values;
  }

  /**
   * Debug print
   * @param {*} ...objects
   * @protected
   */
  _debug() {
    if (this.debug) {
      const args = Array.prototype.slice.call(arguments);
      args.unshift(colors.green('[debug:' + this.constructor.name + ']'));
      console.log.apply(this, args);
    }
  }

  /**
   * @returns {{}}
   */
  get values() {
    if (!this._values) {
      this._values = this._read();
    }

    return this._values;
  }

  /**
   * @returns {string}
   */
  get path() {
    return this._path;
  }

  /**
   * @returns {string}
   */
  get dir() {
    return path.dirname(this._path);
  }

  get debug() {
    return this.__debug;
  }

  set debug(value) {
    this.__debug = value;
  }
}

module.exports = ImpTestFile;
