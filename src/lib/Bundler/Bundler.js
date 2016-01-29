/**
 * Bundles .nut files
 */

'use strict';

var Preprocessor = require('preprocessor');
var path = require('path');

class Bundler {

  constructor(options) {
    // default options
    this._options = {};
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
    let pp = new Preprocessor(inputFile, path.dirname(inputFile));
    return pp.process({});
  }

}

module.exports = Bundler;
