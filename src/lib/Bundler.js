/**
 * Bundles .nut files
 */

'use strict';

var Preprocessor = require('preprocessor');
var path = require('path');
var fs = require('fs');
var colors = require('colors');

class Bundler {

  constructor() {
    this.debug = false;
  }

  /**
   * Process file
   * @param inputFile
   */
  process(inputFile) {
    const inputCode = fs.readFileSync(inputFile, 'utf-8');
    const pp = new Preprocessor(inputCode, path.dirname(inputFile));
    return pp.process({}, this._debug.bind(this));
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

  get debug() {
    return this.__debug;
  }

  set debug(value) {
    this.__debug = value;
  }
}

module.exports = Bundler;
