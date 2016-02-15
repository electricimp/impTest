/**
 * Test session
 *
 * Events:
 *  - message({type, message})
 *  - error(error)
 *  - start
 *  - testMessage
 *  - result
 *  - done
 */

'use strict';

const c = require('colors');
const EventEmitter = require('events');
const randomWords = require('random-words');
const DebugMixin = require('../../DebugMixin');
const sprintf = require('sprintf-js').sprintf;

// todo: move more log parsing outside
// todo: remove debug printouts
// todo: export session errors

// errors
const Errors = {};
Errors.AgentRuntimeError = class AgentRuntimeError extends Error {};
Errors.DeviceDisconnectedError = class DeviceDisconnectedError extends Error {};
Errors.DeviceError = class DeviceError extends Error {};
Errors.DeviceRuntimeError = class DeviceRuntimeError extends Error {};
Errors.SessionFailedError = class SessionFailedError extends Error {};
Errors.TestMethodError = class TestMethodError extends Error {};
Errors.TestStateError = class TestStateError extends Error {};

class Session extends EventEmitter {

  constructor() {
    super();
    DebugMixin.call(this);

    this.id = randomWords(2).join('-');
    this.state = 'initialized';
  }

  /**
   * Run test session
   *
   * @param {string} testType
   * @param {string} deviceId
   * @param {string} modelId
   * @param {string} deviceCode
   * @param {string} agentCode
   */
  run(testType, deviceId, modelId, deviceCode, agentCode) {

    this.logParser.parse(testType, deviceId)

      .on('ready', () => {
        this._start(deviceCode, agentCode, modelId);
      })

      .on('log', this._handleLog.bind(this))

      .on('error', (event) => {
        this.emit('error', event.error);
        // 'done' is emitted on 'error' as well
        // so no need to call to stop()
      })

      .on('done', this._finish.bind(this));
  }

  /**
   * Start session
   * @param {string} deviceCode
   * @param {string} agentCode
   */
  _start(deviceCode, agentCode, modelId) {

    this.emit('message', {
      type: 'info',
      message: c.blue('Starting test session ') + this.id
    });

    this.buildAPIClient
      .createRevision(modelId, deviceCode, agentCode)

      .then((body) => {

        this.emit('message', {
          type: 'info',
          message: c.blue('Created revision: ') + body.revision.version
        });

        return this.buildAPIClient
          .restartModel(modelId)
          .then(/* model restarted */ () => {
            this._debug(c.blue('Model restarted'));
          });
      })

      .catch((error) => {
        this.emit('error', error);
        this._finish();
      });
  }

  /**
   * Finish test session
   */
  _finish() {
    if (this.error) {
      this.emit('message', {
        type: 'info',
        message: c.red('Session ') + this.id + c.red(' failed')
      });
    } else {
      this.emit('message', {
        type: 'info',
        message: c.green('Session ') + this.id + c.green(' succeeded')
      });
    }

    this.emit('done');
  }


  /**
   * Handle log *event* (produced by LogParser)
   *
   * @param {{type, value}} log
   * @private
   */
  _handleLog(log) {
    let m;

    switch (log.type) {

      case 'AGENT_RESTARTED':
        if (this.state === 'initialized') {
          // also serves as an indicator that current code actually started to run
          // and previous revision was replaced
          this.state = 'ready';
        }
        break;

      case 'DEVICE_CODE_SPACE_USAGE':

        if (!this._deviceCodespaceUsage !== log.value) {

          this.emit('message', {
            type: 'info',
            message: c.blue('Device code space usage: ') + sprintf('%.1f%%', log.value)
          });

          this._deviceCodespaceUsage = log.value; // avoid duplicate messages
        }

        break;

      case 'DEVICE_OUT_OF_CODE_SPACE':
        this.emit('error', new Errors.DeviceError('Out of code space'));
        break;

      case 'LASTEXITCODE':

        if (this.state !== 'initialized') {
          if (log.value.match(/out of memory/)) {
            this.emit('error', new Errors.DeviceError('Out of memory'));
          } else {
            this.emit('error', new Errors.DeviceError(log.value));
          }
        }

        break;

      case 'DEVICE_ERROR':
        this.emit('error', new Errors.DeviceRuntimeError(log.value));
        break;

      case 'AGENT_ERROR':
        this.emit('error', new Errors.AgentRuntimeError(log.value));
        break;

      case 'DEVICE_CONNECTED':
        break;

      case 'DEVICE_DISCONNECTED':
        this.emit('error', new Errors.DeviceDisconnectedError());
        break;

      case 'POWERSTATE':
        // ??? any actions needed?

        this.emit('message', {
          type: 'info',
          message: c.blue('Powerstate: ') + log.value
        });

        break;

      case 'FIRMWARE':
        // ??? any actions needed?

        this.emit('message', {
          type: 'info',
          message: c.blue('Firmware: ') + log.value
        });

        break;

      case 'IMPUNIT':

        if (log.value.session !== this.id) {
          // skip messages not from the current session
          // ??? should an error be thrown?
          break;
        }

        this.emit('testMessage');

        switch (log.value.type) {

          case 'START':

            this.emit('start');

            if (this.state !== 'ready') {
              throw new Errors.TestStateError('Invalid test session state');
            }

            this.state = 'started';
            break;

          case 'STATUS':

            if (this.state !== 'started') {
              throw new Errors.TestStateError('Invalid test session state');
            }

            if (m = log.value.message.match(/(.+)::setUp\(\)$/)) {

              // setup
              this.emit('message', {
                type: 'test',
                message: c.blue('Setting up ') + m[1]
              });

            } else if (m = log.value.message.match(/(.+)::tearDown\(\)$/)) {

              // teardown
              this.emit('message', {
                type: 'test',
                message: c.blue('Tearing down ') + m[1]
              });

            } else {

              // status message
              this.emit('message', {
                type: 'test',
                message: log.value.message
              });

            }

            break;

          case 'FAIL':

            if (this.state !== 'started') {
              throw new Errors.TestStateError('Invalid test session state');
            }

            this.emit('error', new Errors.TestMethodError(log.value.message));
            break;

          case 'RESULT':

            this.emit('result');

            if (this.state !== 'started') {
              throw new Errors.TestStateError('Invalid test session state');
            }

            this.tests = log.value.message.tests;
            this.failures = log.value.message.failures;
            this.assertions = log.value.message.assertions;
            this.state = 'finished';

            const sessionMessage =
              `Tests: ${this.tests}, Assertions: ${this.assertions}, ` +
              `Failures: ${this.failures}`;

            if (this.failures) {

              this.emit('message', {
                type: 'test',
                message: c.red(sessionMessage)
              });

              this.emit('error', new Errors.SessionFailedError('Session failed'));

            } else {

              this.emit('message', {
                type: 'info',
                message: c.green(sessionMessage)
              });

            }

            this.stop = true;
            break;

          default:
            break;
        }

        break;

      default:

        this.emit('message', {
          type: 'info',
          message: c.blue('Message of type ') + log.value.type + c.blue(': ') + log.value.message
        });

        break;
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

  get logParser() {
    return this._logParser;
  }

  set logParser(value) {
    this._logParser = value;
  }

  get stop() {
    return this._stop;
  }

  set stop(value) {
    if (this.logParser) {
      this.logParser.stop = value;
    }

    this._stop = value;
  }
}

module.exports.Session = Session;
module.exports.Errors = Errors;
