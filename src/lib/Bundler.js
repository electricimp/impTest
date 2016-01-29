/**
 * Bundles .nut files
 */

'use strict';

var Preprocessor = require('preprocessor');
var path = require('path');
var fs = require('fs');
var colors = require('colors');

class Bundler {

  constructor(options) {
    // default options
    this._options = {
      debug: false
    };

    this.options = options;
  }

  /**
   * @param {{}} options
   */
  set options(options) {
    // mix default options with val
    this._options = Object.assign(
      this._options,
      options
    );
  }

  /**
   * @return {{}}
   */
  get options() {
    return this._options;
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
    if (this._options.debug) {
      const args = Array.prototype.slice.call(arguments);
      args.unshift(colors.green('[debug:' + this.constructor.name + ']'));
      console.log.apply(this, args);
    }
  }
}

module.exports = Bundler;
