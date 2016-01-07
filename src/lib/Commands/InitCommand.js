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
      debug: false,
      force: false,
      config: '.imptest'
    };
  }

  /**
   * Run command
   */
  run() {
    // todo: initialize config
    super.run();
  }

}

module.exports = InitCommand;
