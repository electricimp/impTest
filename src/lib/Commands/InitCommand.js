/**
 * Init command
 */

'use strict';

var AbstractCommand = require('./AbstractCommand');

class InitCommand extends AbstractCommand {
  run() {
    // todo: initialize config
    return super.run();
  }

  get force() {
    return this._force;
  }

  set force(value) {
    this._force = value;
  }
}

module.exports = InitCommand;
