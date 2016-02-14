/**
 * Test session
 *
 * Events:
 *  - info(message)
 */

'use strict';

const c = require('colors');
const EventEmitter = require('events');
const randomWords = require('random-words');
const DebugMixin = require('../../DebugMixin');

class Session extends EventEmitter {

  constructor() {
    super();
    DebugMixin.call(this);

    this.id = randomWords(2).join('-');
    this.state = 'initialized';

    // init promise

    let resolve, reject;

    this.promise = new Promise((ok, err) => {
      resolve = ok;
      reject = err;
    });

    this.promise.resolve = resolve;
    this.promise.reject = reject;
  }

  /**
   * Start session
   * @param {string} deviceCode
   * @param {string} agentCode
   */
  start(deviceCode, agentCode, modelId) {

    this.emit('info', c.blue('Starting test session ') + this.id);

    this.buildAPIClient
      .createRevision(modelId, deviceCode, agentCode)

      .then((body) => {
        this.emit('info', c.blue('Created revision: ') + body.revision.version);

        return this.buildAPIClient
          .restartModel(modelId)
          .then(/* model restarted */ () => {
            this._debug(c.blue('Model restarted'));
          });
      })

      .catch((error) => {
        this._onError(error);
        this.promise.reject(error);
      });
  }

  /**
   * Finish test session
   */
  stop(rejectOnFailure, forceReject) {
    if (this.error) {
      this.emit('info', c.red('Session ') + this.id + c.red(' failed'));
    } else {
      this.emit('info', c.green('Session ') + this.id + c.green(' succeeded'));
    }

    if (this.error && rejectOnFailure) {
      // stop testing cycle
      this.promise.reject();
    } else {
      // proceed to next session
      this.promise.resolve();
    }
  }

  get id() {
    return this._id;
  }

  set id(value) {
    this._id = value;
  }

  get state() {
    return this._state;
  }

  set state(value) {
    this._state = value;
  }

  get deviceCodespaceUsage() {
    return this._deviceCodespaceUsage;
  }

  set deviceCodespaceUsage(value) {
    this._deviceCodespaceUsage = value;
  }

  get failures() {
    return this._failures || 0;
  }

  set failures(value) {
    this._failures = value;
  }

  get assertions() {
    return this._assertions || 0;
  }

  set assertions(value) {
    this._assertions = value;
  }

  get tests() {
    return this._tests || 0;
  }

  set tests(value) {
    this._tests = value;
  }

  get promise() {
    return this._promise;
  }

  set promise(value) {
    this._promise = value;
  }

  get error() {
    return this._error;
  }

  set error(value) {
    this._error = value;
  }

  get buildAPIClient() {
    return this._buildAPIClient;
  }

  set buildAPIClient(value) {
    this._buildAPIClient = value;
  }
}

module.exports = Session;
