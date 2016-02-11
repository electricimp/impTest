/**
 * Init command
 */

'use strict';

var AbstractCommand = require('./AbstractCommand');

class InitCommand extends AbstractCommand {

  /**
   * @returns {{}}
   */
  get defaultOptions() {
    return {
      force: false,
      config: '.imptest'
    };
  }

  /**
   * Run command
   */
  run() {
    // todo: initialize config
    return super.run();
  }

}

module.exports = InitCommand;
