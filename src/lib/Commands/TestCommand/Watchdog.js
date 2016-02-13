/**
 * Watchdog timer
 */

'use strict';

const DebugMixin = require('../../DebugMixin');
const EventEmitter = require('events');

class Watchdog extends EventEmitter {

  constructor() {
    super();
    DebugMixin.call(this);
    this._timerId = null;
    this.timeout = 1;
  }

  start() {
    this._timerId = setTimeout(
      this._onTimeout.bind(this),
      this._timeout * 1000
    );
  }

  reset() {
    this.stop();
    this.start();
  }

  stop() {
    if (this._timerId) {
      clearTimeout(this._timerId);
      this._timerId = null;
    }
  }

  _onTimeout() {
    this.emit('timeout');
  }

  get timeout() {
    return this._timeout;
  }

  set timeout(value) {
    this._timeout = value;
  }
}

module.exports = Watchdog;
