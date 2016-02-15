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
const Session = require('./Session');
const Watchdog = require('../../Watchdog');
const LogsParser = require('./LogsParser');
const sprintf = require('sprintf-js').sprintf;
const randomstring = require('randomstring');
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
const STARTUP_TIMEOUT = 60;

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
          () => d++ < this.imptestFile.values.devices.length && !this._abortTesting,
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
      configCwd = this.imptestFile.dir;
      searchPatterns = this.imptestFile.values.tests;
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
    this._session = new Session();
    this._session.debug = this.debug;
    this._session.buildAPIClient = this.buildAPIClient;
    this._session.on('info', this._info.bind(this));

    // determine device
    const deviceId = this.imptestFile.values.devices[deviceIndex];

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
  t.timeout = ${parseFloat(this.imptestFile.values.timeout)};
  t.stopOnFailure = ${!!this.imptestFile.values.stopOnFailure};
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
                   this.imptestFile.values.devices.length + ': ')
                   + res.device.name + c.blue(' / ') + deviceId);

        // check model
        if (res.device.model_id !== this.imptestFile.values.modelId) {
          throw new errors.WrongModelError('Device is assigned to a wrong model');
        }

        // check online state
        if (res.device.powerstate !== 'online') {
          throw new errors.DevicePowerstateError('Device is in "' + res.device.powerstate + '" powerstate');
        }
      })

      // run test session
      .then(() => this._runSession(deviceId, deviceCode, agentCode, file.type))

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
                                                parseFloat(this.imptestFile.values.timeout);
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
        break;

      case 'session_test_messages':
        this._onError(new errors.SesstionTestMessagesTimeoutError());
        break;

      default:
        break;
    }

    if (this._stopSession) {
      this._session.stop(this.imptestFile.values.stopOnFailure, this._abortTesting);
    }
  }

  /**
   * Execute test via BuildAPI from prepared code
   *
   * @param {string} deviceId
   * @param {string} deviceCode
   * @param {string} agentCode
   * @param {"agent"|"device"} testType
   * @return {Promise}
   * @private
   */
  _runSession(deviceId, deviceCode, agentCode, testType) {

    this._stopSession = false;
    this._initSessionWatchdogs();

    const logsParser = new LogsParser();
    logsParser.buildAPIClient = this.buildAPIClient;

    // start reading logs
    logsParser.parse(testType, deviceId)

      .on('ready', () => {
        this._session.start(deviceCode, agentCode, this.imptestFile.values.modelId);
      })

      // session is over
      .on('done', () => {
        this._session.stop(this.imptestFile.values.stopOnFailure, this._abortTesting);
      })

      .on('log', (event) => {
        this._onLogMessage(event.type, event.value || null);
        logsParser.stop = this._stopSession;
      })

      .on('error', (event) => {
        this._onError(event.error);
        logsParser.stop = this._stopSession;
        // 'done' is emitted on 'error' as well
        // so no need to call to _finishSession()
      });


    return this._session.promise;
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
      this._stopSession = this.imptestFile.values.stopOnFailure;

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
    if (this._stopSession && this.imptestFile.values.stopOnFailure) {
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

      if (this.imptestFile.values.agentFile) {
        sourceFilePath = path.resolve(this.imptestFile.dir, this.imptestFile.values.agentFile);

        /* [debug] */
        this._debug(c.blue('Agent source code file path: ') + sourceFilePath);
        /* [info] */
        this._info(c.blue('Agent source file: ')
                   + this.imptestFile.values.agentFile);

        this._agentSource = fs.readFileSync(sourceFilePath, 'utf-8').trim();
      } else {
        this._agentSource = '/* no agent source provided */';
      }

      if (this.imptestFile.values.deviceFile) {
        sourceFilePath = path.resolve(this.imptestFile.dir, this.imptestFile.values.deviceFile);

        this._debug(c.blue('Device source code file path: ') + sourceFilePath);
        this._info(c.blue('Device source file: ') + this.imptestFile.values.deviceFile);

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
