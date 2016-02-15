/**
 * Test command
 */

'use strict';

//<editor-fold desc="Imports">
const fs = require('fs');
const c = require('colors');
const path = require('path');
const glob = require('glob');
const Errors = require('./Errors');
const Session = require('./Session');
const LogParser = require('./LogParser');
const Watchdog = require('../../Watchdog');
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

/**
 * Test command
 */
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
          () => d++ < this._impTestFile.values.devices.length && !this._abortTesting,
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
      configCwd = this._impTestFile.dir;
      searchPatterns = this._impTestFile.values.tests;
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

    this._session = new Session.Session();

    // determine device
    const deviceId = this._impTestFile.values.devices[deviceIndex];

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
  t.timeout = ${parseFloat(this._impTestFile.values.timeout)};
  t.stopOnFailure = ${!!this._impTestFile.values.stopOnFailure};
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
    return this._buildAPIClient.getDevice(deviceId)

      .then((res) => {
        this._info(c.blue('Using device ' +
                   (deviceIndex + 1) + ' of ' +
                   this._impTestFile.values.devices.length + ': ')
                   + res.device.name + c.blue(' / ') + deviceId);

        // check model
        if (res.device.model_id !== this._impTestFile.values.modelId) {
          throw new Errors.WrongModelError('Device is assigned to a wrong model');
        }

        // check online state
        if (res.device.powerstate !== 'online') {
          throw new Errors.DevicePowerstateError('Device is in "' + res.device.powerstate + '" powerstate');
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
    this._sessionTestMessagesWatchdog.debug = this.debug;
    this._sessionTestMessagesWatchdog.name = 'test-messages';
    this._sessionTestMessagesWatchdog.timeout =
      EXTRA_TEST_MESSAGE_TIMEOUT + parseFloat(this._impTestFile.values.timeout);

    this._sessionTestMessagesWatchdog.on('timeout', () => {
      this._onError(new Errors.SesstionTestMessagesTimeoutError());
      this._session.stop = this._stopSession;
    });

    // session start

    this._sessionStartWatchdog = new Watchdog();
    this._sessionStartWatchdog.debug = this.debug;
    this._sessionStartWatchdog.name = 'session-start';
    this._sessionStartWatchdog.timeout = STARTUP_TIMEOUT;

    this._sessionStartWatchdog.on('timeout', () => {
      this._onError(new Errors.SessionStartTimeoutError());
      this._session.stop = this._stopSession;
    });

    this._sessionStartWatchdog.start();
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

    return new Promise((resolve, reject) => {

      this._stopSession = false;
      this._initSessionWatchdogs();

      this._session.debug = this.debug;
      this._session.buildAPIClient = this._buildAPIClient;

      this._session.logParser = new LogParser();
      this._session.logParser.buildAPIClient = this._buildAPIClient;
      this._session.logParser.debug = this.debug;

      this._session.on('message', (e) => {
        if ('info' === e.type) {
          this._info(e.message);
        } else if ('test' === e.type) {
          this._testLine(e.message);
        }
      });

      this._session.on('error', (error) => {
        this._onError(error);
        this._session.stop = this._stopSession;
      });

      this._session.on('start', () => {
        this._sessionStartWatchdog.stop();
      });

      this._session.on('testMessage', () => {
        this._sessionTestMessagesWatchdog.reset();
      });

      this._session.on('result', () => {
        this._sessionTestMessagesWatchdog.stop();
      });

      this._session.on('done', () => {
        if (this._session.error && this._impTestFile.values.stopOnFailure || this._abortTesting) {
          reject();
        } else {
          resolve();
        }
      });

      this._session.run(
        testType,
        deviceId,
        this._impTestFile.values.modelId,
        deviceCode,
        agentCode
      );

    });
  }

  /**
   * Handle test error
   * @param {Error|string} error
   * @return {boolean} stop test session?
   * @private
   */
  _onError(error) {
    this._debug('Error type: ' + error.constructor.name);

    if (error instanceof Session.Errors.TestMethodError) {

      this._testLine(c.red('Test Error: ' + error.message));
      this._stopSession = this._impTestFile.values.stopOnFailure;

    } else if (error instanceof Session.Errors.TestStateError) {

      this._error(error);
      this._stopSession = true;

    } else if (error instanceof Session.Errors.SessionFailedError) {

      // do nothing, produced at the end of session anyway

    } else if (error instanceof Session.Errors.DeviceDisconnectedError) {

      this._testLine(c.red('Device disconnected'));
      this._stopSession = true;
      this._stopDevice = true;

    } else if (error instanceof Session.Errors.DeviceRuntimeError) {

      this._testLine(c.red('Device Runtime Error: ' + error.message));
      this._stopSession = true;

    } else if (error instanceof Session.Errors.AgentRuntimeError) {

      this._testLine(c.red('Agent Runtime Error: ' + error.message));
      this._stopSession = true;

    } else if (error instanceof Session.Errors.DeviceError) {

      this._testLine(c.red('Device Error: ' + error.message));
      this._stopSession = true;

    } else if (error instanceof Errors.WrongModelError) {

      this._error(error.message);
      this._stopSession = true;
      this._stopDevice = true;

    } else if (error instanceof Errors.DevicePowerstateError) {

      this._error(error.message);
      this._stopSession = true;
      this._stopDevice = true;

    } else if (error instanceof Errors.SessionStartTimeoutError) {

      this._error('Session startup timeout');
      this._stopSession = true;

    } else if (error instanceof Errors.SesstionTestMessagesTimeoutError) {

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
    if (this._stopSession && this._impTestFile.values.stopOnFailure) {
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

      if (this._impTestFile.values.agentFile) {
        sourceFilePath = path.resolve(this._impTestFile.dir, this._impTestFile.values.agentFile);

        /* [debug] */
        this._debug(c.blue('Agent source code file path: ') + sourceFilePath);
        /* [info] */
        this._info(c.blue('Agent source file: ')
                   + this._impTestFile.values.agentFile);

        this._agentSource = fs.readFileSync(sourceFilePath, 'utf-8').trim();
      } else {
        this._agentSource = '/* no agent source provided */';
      }

      if (this._impTestFile.values.deviceFile) {
        sourceFilePath = path.resolve(this._impTestFile.dir, this._impTestFile.values.deviceFile);

        this._debug(c.blue('Device source code file path: ') + sourceFilePath);
        this._info(c.blue('Device source file: ') + this._impTestFile.values.deviceFile);

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
