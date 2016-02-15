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
const errors = require('./Errors');

class Session extends EventEmitter {

  constructor() {
    super();
    DebugMixin.call(this);

    this.id = randomWords(2).join('-');
    this.state = 'initialized';
  }

  run(testType, deviceId, modelId, deviceCode, agentCode) {

    this.logsParser.parse(testType, deviceId)

      .on('ready', () => {
        this.start(deviceCode, agentCode, modelId);
      })

      .on('done', () => {
        this.finish();
      })

      .on('log', (log) => {
        this._handleLog(log.type, log.value);
      })

      .on('error', (event) => {
        this.emit('error', event.error);
        this.logsParser.stop = this.stop;
        // 'done' is emitted on 'error' as well
        // so no need to call to stop()
      });

  }

  /**
   * Start session
   * @param {string} deviceCode
   * @param {string} agentCode
   */
  start(deviceCode, agentCode, modelId) {

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
        this.finish();
      });
  }

  /**
   * Finish test session
   */
  finish(rejectOnFailure, forceReject) {
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
   * Log output handler
   *
   * @param {string} type
   * @param {*} [value=null]
   * @private
   */
  _handleLog(type, value) {
    let m;

    switch (type) {

      case 'AGENT_RESTARTED':
        if (this.state === 'initialized') {
          // also serves as an indicator that current code actually started to run
          // and previous revision was replaced
          this.state = 'ready';
        }
        break;

      case 'DEVICE_CODE_SPACE_USAGE':

        if (!this.deviceCodespaceUsage !== value) {

          this.emit('message', {
            type: 'info',
            message: c.blue('Device code space usage: ') + sprintf('%.1f%%', value)
          });

          this.deviceCodespaceUsage = value; // avoid duplicate messages
        }

        break;

      case 'DEVICE_OUT_OF_CODE_SPACE':
        this.emit('error', new errors.DeviceError('Out of code space'));
        break;

      case 'LASTEXITCODE':

        if (this.state !== 'initialized') {
          if (value.match(/out of memory/)) {
            this.emit('error', new errors.DeviceError('Out of memory'));
          } else {
            this.emit('error', new errors.DeviceError(value));
          }
        }

        break;

      case 'DEVICE_ERROR':
        this.emit('error', new errors.DeviceRuntimeError(value));
        break;

      case 'AGENT_ERROR':
        this.emit('error', new errors.AgentRuntimeError(value));
        break;

      case 'DEVICE_CONNECTED':
        break;

      case 'DEVICE_DISCONNECTED':
        this.emit('error', new errors.DeviceDisconnectedError());
        break;

      case 'POWERSTATE':
        // ??? any actions needed?

        this.emit('message', {
          type: 'info',
          message: c.blue('Powerstate: ') + value
        });

        break;

      case 'FIRMWARE':
        // ??? any actions needed?

        this.emit('message', {
          type: 'info',
          message: c.blue('Firmware: ') + value
        });

        break;

      case 'IMPUNIT':

        if (value.session !== this.id) {
          // skip messages not from the current session
          // ??? should an error be thrown?
          break;
        }

        this.emit('testMessage');

        switch (value.type) {

          case 'START':

            this.emit('start');

            if (this.state !== 'ready') {
              throw new errors.TestStateError('Invalid test session state');
            }

            this.state = 'started';
            break;

          case 'STATUS':

            if (this.state !== 'started') {
              throw new errors.TestStateError('Invalid test session state');
            }

            if (m = value.message.match(/(.+)::setUp\(\)$/)) {

              // setup
              this.emit('message', {
                type: 'test',
                message: c.blue('Setting up ') + m[1]
              });

            } else if (m = value.message.match(/(.+)::tearDown\(\)$/)) {

              // teardown
              this.emit('message', {
                type: 'test',
                message: c.blue('Tearing down ') + m[1]
              });

            } else {

              // status message
              this.emit('message', {
                type: 'test',
                message: value.message
              });

            }

            break;

          case 'FAIL':

            if (this.state !== 'started') {
              throw new errors.TestStateError('Invalid test session state');
            }

            this.emit('error', new errors.TestMethodError(value.message));
            break;

          case 'RESULT':

            this.emit('result');

            if (this.state !== 'started') {
              throw new errors.TestStateError('Invalid test session state');
            }

            this.tests = value.message.tests;
            this.failures = value.message.failures;
            this.assertions = value.message.assertions;
            this.state = 'finished';

            const sessionMessage =
              `Tests: ${this.tests}, Assertions: ${this.assertions}, Failures: ${this.failures}`;

            if (this.failures) {

              this.emit('message', {
                type: 'test',
                message: c.red(sessionMessage)
              });

              this.emit('error', new errors.SessionFailedError('Session failed'));

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
          message: c.blue('Message of type ') + value.type + c.blue(': ') + value.message
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

  get logsParser() {
    return this._logsParser;
  }

  set logsParser(value) {
    this._logsParser = value;
  }

  get stop() {
    return this._stop;
  }

  set stop(value) {
    if (this.logsParser) {
      this.logsParser.stop = value;
    }

    this._stop = value;
  }

  // xxx
  emit(a, b) {
    console.log(a, b);
    super.emit(a, b);
  }
}

module.exports = Session;
