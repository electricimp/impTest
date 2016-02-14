/**
 * Test command
 */

'use strict';

//<editor-fold desc="Imports">
const fs = require('fs');
const c = require('colors');
const path = require('path');
const glob = require('glob');
const errors = require('./Errors');
const EventEmitter = require('events');
const Watchdog = require('../../Watchdog');
const randomWords = require('random-words');
const randomstring = require('randomstring');
const sprintf = require('sprintf-js').sprintf;
const AbstractCommand = require('../AbstractCommand');
const promiseWhile = require('../../utils/promiseWhile');
//</editor-fold>

/**
 * Delay before testing start.
 * Prevents log sessions mixing, allows
 * service messages to be before tests output.
 * [s]
 */
const STARTUP_DELAY = 2;

/**
 * Timeout before session startup
 */
const STARTUP_TIMEOUT = 5;

/**
 * Allow extra time on top of .imptest.timeout before
 * treating test as timed out on a tool siode.
 */
const EXTRA_TEST_MESSAGE_TIMEOUT = 5;

class TestCommand extends AbstractCommand {

  /**
   * Run command
   * @return {Promise}
   * @private
   */
  run() {
    return super.run()
      .then(() => {

        // find test case files
        const testFiles = this._findTestFiles();

        // pre-cache source code
        this._sourceCode;

        let d = 0;

        return promiseWhile(
          () => d++ < this.impTestFile.values.devices.length && !this._abortTesting,
          () => this._runDevice(d - 1, testFiles).catch(() => {
            this._debug(c.red('Device #' + d + ' run failed'));
          })
        );

      });
  }

  /**
   * We're done with testing
   * @private
   */
  finish() {
    if (this._abortTesting) {
      // testing was aborted
      this._error('Testing Aborted' + (this._testingAbortReason ? (': ' + this._testingAbortReason) : ''));
    }

    super.finish();
  }

  /**
   * Run test files on single device
   *
   * @param {number} deviceIndex
   * @param {[]} testFiles
   * @return {Priomise}
   * @private
   */
  _runDevice(deviceIndex, testFiles) {
    let t = 0;

    this._stopDevice = false;

    return promiseWhile(
      () => t++ < testFiles.length && !this._stopDevice,
      () => this._runTestFile(testFiles[t - 1], deviceIndex)
    );
  }

  /**
   * Find test files
   * @returns {[{name, path, type}]}
   * @private
   */
  _findTestFiles() {
    const files = [];
    let configCwd;

    const pushFile = file => {
      files.push({
        name: file,
        path: path.resolve(configCwd, file),
        type: /\bagent\b/i.test(file) ? 'agent' : 'device'
      });
    };

    let searchPatterns = '';

    // test file pattern is passed via cli
    if (this.testCaseFile) {
      // look in the current path
      configCwd = path.resolve('.');
      searchPatterns = this.testCaseFile;
    } else {
      // look in config file directory
      configCwd = this.impTestFile.dir;
      searchPatterns = this.impTestFile.values.tests;
    }

    if (typeof searchPatterns === 'string') {
      searchPatterns = [searchPatterns];
    }

    for (const searchPattern of searchPatterns) {
      for (const file of glob.sync(searchPattern, {cwd: configCwd})) {
        pushFile(file);
      }
    }

    if (files.length === 0) {
      throw new Error('No test files found');
    }

    this._debug(c.blue('Test files found:'), files);

    this._info(c.blue('Found ') +
               files.length +
               c.blue(' test file' +
               (files.length === 1 ? ':' : 's:')) + '\n\t'
               + files.map(e => e.name).join('\n\t')
    );

    return files;
  }

  /**
   * Run test file
   * @param {name, path, type} file
   * @param {name, path, type} deviceIndex
   * @returns {Promise}
   * @private
   */
  _runTestFile(file, deviceIndex) {

    this._blankLine();

    // init test session
    this._session = this._initTestSession();

    this._info(c.blue('Starting test session ') + this._session.id);

    // determine device
    const deviceId = this.impTestFile.values.devices[deviceIndex];

    /* [info] */
    this._info(c.blue('Using ') + file.type + c.blue(' test file ') + file.name);

    // create complete codebase

    // bootstrap code
    const bootstrapCode =
      `// bootstrap tests
imp.wakeup(${STARTUP_DELAY /* prevent log sessions mixing, allow service messages to be before tests output */}, function() {
  local t = ImpUnitRunner();
  t.readableOutput = false;
  t.session = "${this._session.id}";
  t.timeout = ${parseFloat(this.impTestFile.values.timeout)};
  t.stopOnFailure = ${!!this.impTestFile.values.stopOnFailure};
  // poehali!
  t.run();
});`;

    let agentCode, deviceCode;

    // triggers device code space usage message, which also serves as revision launch indicator for device
    const reloadTrigger = '// force code update\n"' + randomstring.generate(32) + '"';

    if ('agent' === file.type) {
      agentCode = this._frameworkCode + '\n\n' +
                  this._sourceCode.agent + '\n\n' +
                  fs.readFileSync(file.path, 'utf-8').trim() + '\n\n' +
                  bootstrapCode;
      deviceCode = this._sourceCode.device + '\n\n' +
                   reloadTrigger;
    } else {
      deviceCode = this._frameworkCode + '\n\n' +
                   this._sourceCode.device + '\n\n' +
                   fs.readFileSync(file.path, 'utf-8').trim() + '\n\n' +
                   bootstrapCode + '\n\n' +
                   reloadTrigger;
      agentCode = this._sourceCode.agent;
    }

    this._debug(c.blue('Agent code size: ') + agentCode.length + ' bytes');
    this._debug(c.blue('Device code size: ') + deviceCode.length + ' bytes');

    // resolve device info
    return this.buildAPIClient.getDevice(deviceId)

      .then((res) => {
        this._info(c.blue('Using device ' +
                   (deviceIndex + 1) + ' of ' +
                   this.impTestFile.values.devices.length + ': ')
                   + res.device.name + c.blue(' / ') + deviceId);

        // check model
        if (res.device.model_id !== this.impTestFile.values.modelId) {
          throw new errors.WrongModelError('Device is assigned to a wrong model');
        }

        // check online state
        if (res.device.powerstate !== 'online') {
          throw new errors.DevicePowerstateError('Device is in "' + res.device.powerstate + '" powerstate');
        }
      })

      // run test session
      .then(() => this._runTestSession(deviceCode, agentCode, file.type))

      .catch((error) => {
        this._onError(error);
      });
  }

  /**
   * Initialize session watchdog timers
   * @private
   */
  _initSessionWatchdogs() {
    // test messages
    this._sessionTestMessagesWatchdog = new Watchdog();
    this._sessionTestMessagesWatchdog.name = 'session_test_messages';
    this._sessionTestMessagesWatchdog.timeout = EXTRA_TEST_MESSAGE_TIMEOUT +
                                                parseFloat(this.impTestFile.values.timeout);
    this._sessionTestMessagesWatchdog.on('timeout', this._onSessionWatchdog.bind(this));

    // session start
    this._sessionStartWatchdog = new Watchdog();
    this._sessionStartWatchdog.name = 'session_start';
    this._sessionStartWatchdog.timeout = STARTUP_TIMEOUT;
    this._sessionStartWatchdog.on('timeout', this._onSessionWatchdog.bind(this));
    this._sessionStartWatchdog.start();
  }

  /**
   * Handle session watchdog timeouts
   * @param {{name: {string}}} event
   * @private
   */
  _onSessionWatchdog(event) {
    switch (event.name) {
      case 'session_start':
        this._onError(new errors.SessionStartTimeoutError());
        this._finishSession();
        break;

      case 'session_test_messages':
        this._onError(new errors.SesstionTestMessagesTimeoutError());
        this._finishSession();
        break;

      default:
        break;
    }
  }

  /**
   * Initialize test session
   * @private
   */
  _initTestSession() {
    let sessionId = null;

    while (null === sessionId || (this._session && sessionId === this._session.id)) {
      sessionId = randomWords(2).join('-');
    }

    const p = new Promise((resolve, reject) => {
      p.resolve = resolve;
      p.reject = reject;
    });

    return {
      id: sessionId,
      state: 'initialized',
      deviceCodespaceUsage: 0,
      failures: 0,
      assertions: 0,
      tests: 0,
      promise: p,
      error: false // overall error
    };
  }

  /**
   * Execute test via BuildAPI from prepared code
   *
   * @param {string} deviceCode
   * @param {string} agentCode
   * @param {"agent"|"device"} type
   * @return {Promise}
   * @private
   */
  _runTestSession(deviceCode, agentCode, type) {

    this._stopSession = false;
    this._initSessionWatchdogs();

      // start reading logs
      this._readLogs(type, this.impTestFile.values.devices[0])

        .on('ready', () => {
          this._startSession(deviceCode, agentCode);
        })

        // session is over
        .on('done', () => {
          this._finishSession();
        })

        .on('log', (event) => {
          this._onLogMessage(event.type, event.value || null);
        })

        .on('error', (event) => {
          this._onError(event.error);
          // done is emitted on 'error' as well
          // so no need to call to _finishSession()
        });

  }

  /**
   * Start session
   * @param {string} deviceCode
   * @param {string} agentCode
   * @private
   */
  _startSession(deviceCode, agentCode) {
    this.buildAPIClient
      .createRevision(this.impTestFile.values.modelId, deviceCode, agentCode)

      .then((body) => {
        this._info(c.blue('Created revision: ') + body.revision.version);
        return this.buildAPIClient
          .restartModel(this.impTestFile.values.modelId)
          .then(/* model restarted */() => {
            this._debug(c.blue('Model restarted'));
          });
      })

      .catch((error) => {
        this._onError(error);
        this._session.promise.reject(error);
      });
  }

  /**
   * Finish test session
   * @private
   */
  _finishSession() {
    if (this._session.error) {
      this._info(c.red('Session ') + this._session.id + c.red(' failed'));
    } else {
      this._info(c.green('Session ') + this._session.id + c.green(' succeeded'));
    }

    if (this._abortTesting || (this._session.error && this.impTestFile.values.stopOnFailure)) {
      // stop testing cycle
      this._session.promise.reject();
    } else {
      // proceed to next session
      this._session.promise.resolve();
    }
  }

  /**
   * Read device logs, convert them to predefined types
   *
   * @param {"agent"|"device"} type
   * @param {string} deviceId
   * @returns {EventEmitter} Events: ready, done, log, error
   *
   * @private
   */
  _readLogs(type, deviceId) {
    const ee = new EventEmitter();

    // for historical reasons, device produce server.* messages
    const apiType = {agent: 'agent', device: 'server'}[type];

    this.buildAPIClient.streamDeviceLogs(deviceId, (data) => {

        if (data) {

          for (const log of data.logs) {

            // xxx
            // console.log(c.yellow(JSON.stringify(log)));

            let m;
            const message = log.message;

            try {

              switch (log.type) {

                case 'status':

                  if (message.match(/Agent restarted/)) {
                    // agent restarted
                    ee.emit('log', {type: 'AGENT_RESTARTED'});
                  } else if (m = message.match(/(Out of space)?.*?([\d\.]+)% program storage used/)) {
                    // code space used
                    ee.emit('log', {type: 'DEVICE_CODE_SPACE_USAGE', value: parseFloat(m[2])});

                    // out of code space
                    if (m[1]) {
                      ee.emit('log', {type: 'DEVICE_OUT_OF_CODE_SPACE'});
                    }
                  } else if (message.match(/Device disconnected/)) {
                    ee.emit('log', {type: 'DEVICE_DISCONNECTED'});
                  } else if (message.match(/Device connected/)) {
                    ee.emit('log', {type: 'DEVICE_CONNECTED'});
                  } else {
                    ee.emit('log', {type: 'UNKNOWN', value: log});
                  }

                  break;

                // error
                case 'lastexitcode':
                  ee.emit('log', {type: 'LASTEXITCODE', value: message});
                  break;

                case 'server.log':
                case 'agent.log':

                  if (log.type.replace(/\.log$/, '') === apiType) {
                    if (message.match(/__IMPUNIT__/)) {
                      // impUnit message, decode it
                      ee.emit('log', {type: 'IMPUNIT', value: JSON.parse(message)});
                    }
                  }

                  break;

                case 'agent.error':
                  ee.emit('log', {type: 'AGENT_ERROR', value: message});
                  break;

                case 'server.error':
                  ee.emit('log', {type: 'DEVICE_ERROR', value: message});
                  break;

                case 'powerstate':
                  ee.emit('log', {type: 'POWERSTATE', value: message});
                  break;

                case 'firmware':
                  ee.emit('log', {type: 'FIRMWARE', value: message});
                  break;

                default:
                  ee.emit('log', {type: 'UNKNOWN', value: log});
                  break;
              }

            } catch (e) {
              ee.emit('error', {error: e});
              this._onError(e);
            }

            // are we done?
            if (this._stopSession) {
              ee.emit('done');
              break;
            }
          }

        } else {
          // we're connected
          ee.emit('ready');
        }

        return !this._stopSession;
      })

      .catch((e) => {
        this._onError(e);
        this.emit('done');
      });

    return ee;
  }

  /**
   * Log output handler
   *
   * @param {string} type
   * @param {*} [value=null]
   * @private
   */
  _onLogMessage(type, value) {
    let m;

    switch (type) {

      case 'AGENT_RESTARTED':
        if (this._session.state === 'initialized') {
          // also serves as an indicator that current code actually started to run
          // and previous revision was replaced
          this._session.state = 'ready';
        }
        break;

      case 'DEVICE_CODE_SPACE_USAGE':

        if (!this._session.deviceCodespaceUsage !== value) {
          this._info(c.blue('Device code space usage: ') + sprintf('%.1f%%', value));
          this._session.deviceCodespaceUsage = value; // avoid duplicate messages
        }

        break;

      case 'DEVICE_OUT_OF_CODE_SPACE':
        this._onError(new errors.DeviceError('Out of code space'));
        break;

      case 'LASTEXITCODE':

        if (this._session.state !== 'initialized') {
          if (value.match(/out of memory/)) {
            this._onError(new errors.DeviceError('Out of memory'));
          } else {
            this._onError(new errors.DeviceError(value));
          }
        }

        break;

      case 'DEVICE_ERROR':
        this._onError(new errors.DeviceRuntimeError(value));
        break;

      case 'AGENT_ERROR':
        this._onError(new errors.AgentRuntimeError(value));
        break;

      case 'DEVICE_CONNECTED':
        break;

      case 'DEVICE_DISCONNECTED':
        this._onError(new errors.DeviceDisconnectedError());
        break;

      case 'POWERSTATE':
        // todo: researh if any actiones needed
        this._info(c.blue('Powerstate: ') + value);
        break;

      case 'FIRMWARE':
        // todo: researh if any actiones needed
        this._info(c.blue('Firmware: ') + value);
        break;

      case 'IMPUNIT':

        if (value.session !== this._session.id) {
          // skip messages not from the current session
          // ??? should an error be thrown?
          break;
        }

        switch (value.type) {
          case 'START':

            // stop session start watchdog
            this._sessionStartWatchdog.stop();

            if (this._session.state !== 'ready') {
              throw new errors.TestStateError('Invalid test session state');
            }

            this._session.state = 'started';
            break;

          case 'STATUS':

            // reset test message watchdog
            this._sessionTestMessagesWatchdog.reset();

            if (this._session.state !== 'started') {
              throw new errors.TestStateError('Invalid test session state');
            }

            if (m = value.message.match(/(.+)::setUp\(\)$/)) {
              // setup
              this._testLine(c.blue('Setting up ') + m[1]);
            } else if (m = value.message.match(/(.+)::tearDown\(\)$/)) {
              // teardown
              this._testLine(c.blue('Tearing down ') + m[1]);
            } else {
              // status message
              this._testLine(value.message);
            }

            break;

          case 'FAIL':

            // stop test message watchdog
            this._sessionTestMessagesWatchdog.stop();

            if (this._session.state !== 'started') {
              throw new errors.TestStateError('Invalid test session state');
            }

            this._onError(new errors.TestMethodError(value.message));
            break;

          case 'RESULT':

            // stop test message watchdog
            this._sessionTestMessagesWatchdog.stop();

            if (this._session.state !== 'started') {
              throw new errors.TestStateError('Invalid test session state');
            }

            this._session.tests = value.message.tests;
            this._session.failures = value.message.failures;
            this._session.assertions = value.message.assertions;
            this._session.state = 'finished';

            const sessionMessage =
              `Tests: ${this._session.tests}, Assertions: ${this._session.assertions}, Failures: ${this._session.failures}`;

            if (this._session.failures) {
              this._testLine(c.red(sessionMessage));
              this._onError(new errors.SessionFailedError('Session failed'));
            } else {
              this._testLine(c.green(sessionMessage));
            }

            this._stopSession = true;
            break;

          default:
            break;
        }

        break;

      default:
        this._info(c.blue('Message of type ') + value.type + c.blue(': ') + value.message);
        break;
    }
  }

  /**
   * Handle test error
   * @param {Error|string} error
   * @return {boolean} stop test session?
   * @private
   */
  _onError(error) {
    this._debug('Error type: ' + error.constructor.name);

    if (error instanceof errors.TestMethodError) {

      this._testLine(c.red('Test Error: ' + error.message));
      this._stopSession = this.impTestFile.values.stopOnFailure;

    } else if (error instanceof errors.TestStateError) {

      this._error(error);
      this._stopSession = true;

    } else if (error instanceof errors.SessionFailedError) {

      // do nothing, produced at the end of session anyway

    } else if (error instanceof errors.DeviceDisconnectedError) {

      this._testLine(c.red('Device disconnected'));
      this._stopSession = true;
      this._stopDevice = true;

    } else if (error instanceof errors.DeviceRuntimeError) {

      this._testLine(c.red('Device Runtime Error: ' + error.message));
      this._stopSession = true;

    } else if (error instanceof errors.AgentRuntimeError) {

      this._testLine(c.red('Agent Runtime Error: ' + error.message));
      this._stopSession = true;

    } else if (error instanceof errors.DeviceError) {

      this._testLine(c.red('Device Error: ' + error.message));
      this._stopSession = true;

    } else if (error instanceof errors.WrongModelError) {

      this._error(error.message);
      this._stopSession = true;
      this._stopDevice = true;

    } else if (error instanceof errors.DevicePowerstateError) {

      this._error(error.message);
      this._stopSession = true;
      this._stopDevice = true;

    } else if (error instanceof errors.SessionStartTimeoutError) {

      this._error('Session startup timeout');
      this._stopSession = true;

    } else if (error instanceof errors.SesstionTestMessagesTimeoutError) {

      this._error('Testing timeout');

      // tool-side timeouts are longer than test-side, so they
      // indicate for test session to become unresponsive,
      // so it makes sense to stop it
      this._stopSession = true;

    } else if (error instanceof Error) {

      this._error(error.message);
      this._stopSession = true;

    } else {

      this._error(error);
      this._stopSession = true;

    }

    if (this._session) {
      this._session.error = true;
    }

    // abort completely?
    // _stopSession==true means the error is
    // big enough to interrupt the session.
    // in combination w/stopOnFailure it makes sense
    // to abort the entire testing
    if (this._stopSession && this.impTestFile.values.stopOnFailure) {
      this._abortTesting = true;
    }

    // command has not succeeded
    this._success = false;
  }

  /**
   * Print [test] message
   * @param {*} ...objects
   * @protected
   */
  _testLine() {
    this._log('test', c.grey, arguments);
  }

  /**
   * Print blank line
   * @private
   */
  _blankLine() {
    console.log(c.gray(''));
  }

  /**
   * Read source code
   * @return {{agent, device}}
   * @private
   */
  get _sourceCode() {

    if (!this._agentSource || !this._deviceSource) {

      let sourceFilePath;

      if (this.impTestFile.values.agentFile) {
        sourceFilePath = path.resolve(this.impTestFile.dir, this.impTestFile.values.agentFile);

        /* [debug] */
        this._debug(c.blue('Agent source code file path: ') + sourceFilePath);
        /* [info] */
        this._info(c.blue('Agent source file: ')
                   + this.impTestFile.values.agentFile);

        this._agentSource = fs.readFileSync(sourceFilePath, 'utf-8').trim();
      } else {
        this._agentSource = '/* no agent source provided */';
      }

      if (this.impTestFile.values.deviceFile) {
        sourceFilePath = path.resolve(this.impTestFile.dir, this.impTestFile.values.deviceFile);

        this._debug(c.blue('Device source code file path: ') + sourceFilePath);
        this._info(c.blue('Device source file: ') + this.impTestFile.values.deviceFile);

        this._deviceSource = fs.readFileSync(sourceFilePath, 'utf-8').trim();
      } else {
        this._deviceSource = '/* no device source provided */';
      }

    }

    return {
      agent: this._agentSource,
      device: this._deviceSource
    };
  }

  /**
   * Read framework code
   * @return {string}
   * @private
   */
  get _frameworkCode() {
    if (!this.__frameworkCode) {
      this.__frameworkCode = this.bundler.process(this.testFrameworkFile).trim();
    }

    return this.__frameworkCode;
  }

  // <editor-fold desc="Accessors" defaultstate="collapsed">

  get testFrameworkFile() {
    return this._testFrameworkFile;
  }

  set testFrameworkFile(value) {
    this._testFrameworkFile = value;
  }

  get testCaseFile() {
    return this._testCaseFile;
  }

  set testCaseFile(value) {
    this._testCaseFile = value;
  }

  get bundler() {
    return this._bundler;
  }

  set bundler(value) {
    this._bundler = value;
  }

  // </editor-fold>
}

module.exports = TestCommand;
