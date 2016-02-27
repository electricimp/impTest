/**
 * .imptest file abstraction
 *
 * @see https://github.com/electricimp/impTest/blob/develop/docs/imptest-spec.md
 * @author Mikhail Yurasov <mikhail@electricimp.com>
 */

'use strict';

const c = require('colors');
const fs = require('fs');
const path = require('path');
const DebugMixin = require('./DebugMixin');
const stripJsonComments = require('strip-json-comments');

/**
 * Config file abstraction
 */
class ImpTestFile {

  /**
   * @param {string} configPath
   */
  constructor(configPath) {
    DebugMixin.call(this);
    this._path = path.resolve(configPath);
  }

  /**
   * @return {bool}
   */
  exists() {
    return fs.existsSync(this._path);
  }

  /**
   * Write config
   */
  write() {
    fs.writeFileSync(this.path, this.json);
  }

  get defaultValues() {
    return {
      apiKey: null,
      modelId: '',
      devices: [],
      agentFile: '',
      deviceFile: '',
      stopOnFailure: false,
      timeout: 30,
      tests: ['*.test.nut', 'tests/**/*.test.nut']
    };
  }

  /**
   * Read values
   * @return {{}}
   * @private
   */
  _read() {
    this._debug(c.blue('Using config file:'), this.path);

    let values = {};

    if (this.exists()) {
      values = fs.readFileSync(this.path).toString();
      values = stripJsonComments(values);
      values = JSON.parse(values);
    }

    values = Object.assign(this.defaultValues, values);

    if (this.debug) {
      // hide api key
      const debugValues = /* clone value */ JSON.parse(JSON.stringify(values));
      debugValues.apiKey = '[hidden]';
      this._debug(c.blue('Config values:'), debugValues);
    }

    return values;
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
   * Get config as json
   * @return {*}
   */
  get json() {
    const v = this.values;
    if (v.apiKey === null) delete v.apiKey;
    if (v.deviceFile === null) v.deviceFile = false;
    if (v.agentFile === null) v.agentFile = false;
    return JSON.stringify(v, null, 4);
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
}

module.exports = ImpTestFile;
