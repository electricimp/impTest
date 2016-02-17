/**
 * Watchdog timer
 */

'use strict';

const DebugMixin = require('./DebugMixin');
const EventEmitter = require('events');

class Watchdog extends EventEmitter {

  constructor() {
    super();
    DebugMixin.call(this);
    this.name = null;
    this.timeout = 0;
    this._timerId = null;
  }

  start() {
    this._timerId = setTimeout(
      this._onTimeout.bind(this),
      this._timeout * 1000
    );

    this._debug(`Watchdog "${this.name}" started`);
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

    this._debug(`Watchdog "${this.name}" stopped`);
  }

  _onTimeout() {
    this._debug(`Watchdog "${this.name}" timed out`);
    this.emit('timeout', {name: this.name});
  }

  get timeout() {
    return this._timeout;
  }

  set timeout(value) {
    this._timeout = value;
  }

  get name() {
    return this._name;
  }

  set name(value) {
    this._name = value;
  }
}

module.exports = Watchdog;
