/**
 * Bundles .nut files
 *
 * @author Mikhail Yurasov <mikhail@electricimp.com>
 */

'use strict';

const fs = require('fs');
const path = require('path');
const DebugMixin = require('./DebugMixin');
const Preprocessor = require('preprocessor');

class Bundler {
  constructor() {
    DebugMixin.call(this);
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
}

module.exports = Bundler;
