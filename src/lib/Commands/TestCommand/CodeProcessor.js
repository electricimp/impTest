/**
 * Code processor
 */

'use strict';

class CodeProcessor {

  process() {
    const m = this.source.match(/\$\{(env:)([a-z_][a-z0-9_]*)\}/i);
  }

  // <editor-fold desc="Accessors" defaultstate="collapsed">

  get source() {
    return this._source;
  }

  set source(value) {
    this._source = value;
  }

  // </editor-fold>
}

module.exports = CodeProcessor;
