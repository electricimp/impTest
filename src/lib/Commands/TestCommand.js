/**
 * Test command
 */

'use strict';

var fs = require('fs');
var path = require('path');
var glob = require('glob');
var c = require('colors');
var AbstractCommand = require('./AbstractCommand');
var BuildAPIClient = require('../BuildAPIClient');
var Bundler = require('../Bundler');
var promiseWhile = require('../utils/promiseWhile');
var randomWords = require('random-words');
var TestCaseError = require('../Errors/TestCaseError');
var TestStateError = require('../Errors/TestStateError');
var SessionFailedError = require('../Errors/SessionFailedError');

class TestCommand extends AbstractCommand {

  /**
   * @returns {{}}
   */
  get defaultOptions() {
    return {
      debug: false,
      config: '.imptest',
      testFrameworkFile: '', // path to test framework main file
      testCaseFile: null, // path to test case file, of empty test cases will be searched automatically
      startTimeout: 0 // [s]
    };
  }

  /**
   * Run command
   * @return {Promise}
   * @private
   */
  run() {

    super.run();

    // find test case files
    const testFiles = this._findTestFiles();

    /* [debug] */
    this._debug(c.blue('Test files found:'), testFiles);

    /* [info] */
    this._info(c.blue('Found ') +
               testFiles.length +
               c.blue(' test file' +
               (testFiles.length === 1 ? '' : 's')) + ': '
               + testFiles.map(e => e.name).join(', ')
    );

    // run test files

    let i = 0;

    return promiseWhile(
      () => i++ < testFiles.length,
      () => {
        /* [blank] */
        this._blankLine();
        return this._runTestFile(testFiles[i - 1]);
      }
    );
  }

  /**
   * @return {BuildAPIClient}
   * @private
   */
  _getBuildApiClient() {
    if (!this._client) {
      this._client = new BuildAPIClient({
        debug: this._options.debug,
        apiKey: this._config.values.apiKey
      });
    }

    return this._client;
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
    if (this._options.testCaseFile) {
      // look in the current path
      configCwd = path.resolve('.');
      searchPatterns = this._options.testCaseFile;
    } else {
      // look in config file directory
      configCwd = this._config.dir;
      searchPatterns = this._config.values.tests;
    }

    if (typeof searchPatterns === 'string') {
      searchPatterns = [searchPatterns];
    }

    for (const searchPattern of searchPatterns) {
      for (const file of glob.sync(searchPattern, {cwd: configCwd})) {
        pushFile(file);
      }
    }

    return files;
  }

  /**
   * Read source code
   * @return {{agent, device}}
   * @private
   */
  _getSourceCode() {

    if (!this._agentSource || !this._deviceSource) {

      let sourceFilePath;

      if (this._config.values.agentFile) {
        sourceFilePath = path.resolve(this._config.dir, this._config.values.agentFile);

        /* [debug] */
        this._debug(c.blue('Agent source code file path: ') + sourceFilePath);
        /* [info] */
        this._info(c.blue('Agent source: ')
                   + this._config.values.agentFile);

        this._agentSource = fs.readFileSync(sourceFilePath, 'utf-8');
      } else {
        this._agentSource = '/* no agent source provided */';
      }

      if (this._config.values.deviceFile) {
        sourceFilePath = path.resolve(this._config.dir, this._config.values.deviceFile);

        /* [debug] */
        this._debug(c.blue('Device source code file path: ') + sourceFilePath);
        /* [info] */
        this._info(c.blue('Device source: ')
                   + this._config.values.deviceFile);

        this._deviceSource = fs.readFileSync(sourceFilePath, 'utf-8');
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
  _getFrameworkCode() {
    if (!this._frameworkCode) {
      this._frameworkCode = (new Bundler({debug: this._options.debug}))
        .process(this._options.testFrameworkFile);
    }

    return this._frameworkCode;
  }

  /**
   * Run test file
   * @param {name, path, type} file
   * @returns {Promise}
   * @private
   */
  _runTestFile(file) {
    // init test session
    this._initTestSession();

    /* [info] */
    this._info(c.blue('Using ') + file.type + c.blue(' test file ') + file.name);

    // create complete codebase

    // bootstrap code
    const bootstrapCode =
      `
// run tests
imp.wakeup(${parseFloat(this._options.startTimeout) /* prevent log sessions mixing */}, function() {
  local t = ImpUnitRunner();
  t.readableOutput = false;
  t.session = "${this._session.id}";
  t.timeout = ${parseFloat(this._config.values.timeout)};
  t.stopOnFailure = ${!!this._config.values.stopOnFailure};
  // poehali!
  t.run();
});
`;

    let agentCode, deviceCode;

    if ('agent' === file.type) {
      agentCode = this._getFrameworkCode() + '\n\n' +
                  this._getSourceCode().agent + '\n\n' +
                  fs.readFileSync(file.path, 'utf-8') + '\n\n' +
                  bootstrapCode;
      deviceCode = this._getSourceCode().device;
    } else {
      deviceCode = this._getFrameworkCode() + '\n\n' +
                   this._getSourceCode().device + '\n\n' +
                   fs.readFileSync(file.path, 'utf-8') + '\n\n' +
                   bootstrapCode;
      agentCode = this._getSourceCode().agent;
    }

    /* [info] */
    this._info(c.blue('Agent code size: ') + agentCode.length + ' bytes');
    /* [info] */
    this._info(c.blue('Device code size: ') + deviceCode.length + ' bytes');

    return this._runTestSession(deviceCode, agentCode, file.type);
  }

  /**
   * Initialize test session
   * @private
   */
  _initTestSession() {
    this._session = {
      id: randomWords(2).join('-'),
      state: 'ready',
      failures: 0,
      assertions: 0,
      tests: 0
    };

    this._info(c.blue('Starting test session ') + this._session.id);
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

    const client = this._getBuildApiClient();

    // start reading logs
    this._readLogs(type, this._config.values.devices[0])

      .then(() => {
        return client.createRevision(this._config.values.modelId, deviceCode, agentCode);
      })

      .then((body) => {
        this._info(c.blue('Created revision: ') + body.revision.version);
        return client.restartModel(this._config.values.modelId);
      })

      .catch((error) => {
        this._onError(error);
      });
  }

  /**
   * Read device logs
   *
   * @param {"agent"|"device"} test
   * @param {string} deviceId
   * @returns {Promise} resolves after obtaining poll url
   *
   * @private
   */
  _readLogs(test, deviceId) {
    return new Promise((resolve, reject) => {
      this._getBuildApiClient().streamDeviceLogs(deviceId, (data) => {

        let stopSession = false;

        if (data) {

          for (const log of data.logs) {

            const message = log.message;
            let m;

            try {

              if (message.match(/Agent restarted/)) {
                // agent restarted
                stopSession = this._onLogMessage('AGENT_RESTARTED');
              } else if (m = message.match(/([\d\.]+%) program storage used/)) {
                // code space used
                stopSession = this._onLogMessage('DEVICE_CODE_SPACE_USAGE', m[1]);
              } else if (message.match(/__IMPUNIT__/)) {
                // impUnit message, decode it
                stopSession = this._onLogMessage('IMPUNIT', JSON.parse(message));
              }

            } catch (e) {
              // cannot reject, promise has been resolved already on getting poll url
              this._error(e.message);
              stopSession = true;
            }

            //console.log(c.magenta(JSON.stringify(log)));
          }
        } else {
          // empty data means we're connected
          resolve();
        }

        return !stopSession;

      })
        .catch((e) => {
          this._onError(e);
          reject(e);
        });
    });
  }

  /**
   * Log output handler
   *
   * @param {string} type
   * @param {*} [message=null]
   * @private
   */
  _onLogMessage(type, message) {
    let m;
    let stopSession = false;

    switch (type) {

      case 'AGENT_RESTARTED':
        break;

      case 'DEVICE_CODE_SPACE_USAGE':
        this._info(c.blue('Device code space usage: ') + message);
        break;

      case 'IMPUNIT':

        if (message.session !== this._session.id) {
          // skip messages not from the current session
          // ??? should an error be thrown?
          break;
        }

        switch (message.type) {
          case 'START':

            if (this._session.state !== 'ready') {
              throw new TestStateError('Invalid test session state');
            }

            this._session.state = 'started';
            break;

          case 'STATUS':

            if (this._session.state !== 'started') {
              throw new TestStateError('Invalid test session state');
            }

            if (m = message.message.match(/(.+)::setUp\(\)$/)) {
              // setup
              this._testLine(c.blue('Setting up ') + m[1]);
            } else if (m = message.message.match(/(.+)::tearDown\(\)$/)) {
              // teardown
              this._testLine(c.blue('Tearing down ') + m[1]);
            } else {
              // status message
              this._testLine(message.message);
            }

            break;

          case 'FAIL':

            if (this._session.state !== 'started') {
              throw new Error('Invalid test session state');
            }

            this._onError(new TestCaseError(message.message));
            break;

          case 'RESULT':

            if (this._session.state !== 'started') {
              throw new TestStateError('Invalid test session state');
            }

            this._session.tests = message.message.tests;
            this._session.failures = message.message.failures;
            this._session.assertions = message.message.assertions;
            this._session.state = 'finished';

            const sessionMessage =
              `Tests: ${this._session.tests}, Assertions: ${this._session.assertions}, Failures: ${this._session.failures}`;

            if (this._session.failures) {
              this._testLine(c.red(sessionMessage));
              throw new SessionFailedError('Session failed');
            } else {
              this._testLine(c.green(sessionMessage));
            }

            stopSession = true;
            break;

          default:
            break;
        }

        break;

      default:
        break;
    }

    return stopSession;
  }

  /**
   * Handle test error
   * @param {Error|string} error
   * @return {boolean} stop test session?
   * @private
   */
  _onError(error) {
    let stop = false;

    if (error instanceof TestCaseError) {
      error = 'Error: ' + error.message;
      stop = false;
      this._testLine(c.red(error));
    } else if (error instanceof TestStateError) {
      error = error.message;
      stop = !!this._config.values.stopOnFailure;
      this._testLine(c.red(error));
    } else if (error instanceof Error) {
      error = error.message;
      this._error(error);
      process.exit(1);
    } else {
      this._error(error);
      process.exit(1);
    }

    return stop;
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
    console.log(c.gray('........................'));
  }
}

module.exports = TestCommand;
