/**
 * Test command
 */

'use strict';

//<editor-fold desc="imports">
const fs = require('fs');
const c = require('colors');
const path = require('path');
const glob = require('glob');
const Bundler = require('../Bundler');
const EventEmitter = require('events');
const randomWords = require('random-words');
const AbstractCommand = require('./AbstractCommand');
const BuildAPIClient = require('../BuildAPIClient');
const promiseWhile = require('../utils/promiseWhile');
const TestMethodError = require('../Errors/TestMethodError');
const TestStateError = require('../Errors/TestStateError');
const SessionFailedError = require('../Errors/SessionFailedError');
//</editor-fold>

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
      startTimeout: 2 // [s]
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

    if (testFiles.length) {
      /* [info] */
      this._info(c.blue('Found ') +
                 testFiles.length +
                 c.blue(' test file' +
                 (testFiles.length === 1 ? ':' : 's:')) + '\n\t'
                 + testFiles.map(e => e.name).join('\n\t')
      );
    } else {
      this._onError(new Error('No test files found'));
    }

    // pre-cache source code
    this._getSourceCode();

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
        this._info(c.blue('Agent source file: ')
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
        this._info(c.blue('Device source file: ')
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
imp.wakeup(${parseFloat(this._options.startTimeout) /* prevent log sessions mixing, allow service messages to be before tests output */}, function() {
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

    const sessionDef = '_impUnitSession <- "' + this._session.id + '";\n\n';

    if ('agent' === file.type) {
      agentCode = this._getFrameworkCode() + '\n\n' +
                  this._getSourceCode().agent + '\n\n' +
                  sessionDef +
                  fs.readFileSync(file.path, 'utf-8') + '\n\n' +
                  bootstrapCode;
      deviceCode = sessionDef + /* also triggers device code space usage message due to the change on code every time, takes 0.04% code space on imp001 */
                   this._getSourceCode().device;
    } else {
      deviceCode = this._getFrameworkCode() + '\n\n' +
                   this._getSourceCode().device + '\n\n' +
                   sessionDef +
                   fs.readFileSync(file.path, 'utf-8') + '\n\n' +
                   bootstrapCode;
      agentCode = sessionDef + this._getSourceCode().agent;
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

    this._info(c.magenta('Starting test session ') + this._session.id);
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

    return new Promise((resolve, reject) => {

      const client = this._getBuildApiClient();

      // start reading logs
      this._readLogs(type, this._config.values.devices[0])
        .on('ready', () => {

          client.createRevision(this._config.values.modelId, deviceCode, agentCode)

            .then((body) => {
              this._info(c.blue('Created revision: ') + body.revision.version);
              return client.restartModel(this._config.values.modelId);
            })

            .catch((error) => {
              this._onError(error);
              reject(error);
            });

        })

        .on('done', resolve);

    });
  }

  /**
   * Read device logs
   *
   * @param {"agent"|"device"} type
   * @param {string} deviceId
   * @returns {EventEmitter} Events: ready, done
   *
   * @private
   */
  _readLogs(type, deviceId) {
    const ee = new EventEmitter();
    const typeFilter = {agent: 'agent.log', device: 'server.log'}[type];

    this._getBuildApiClient().streamDeviceLogs(deviceId, (data) => {

        let stopSession = false;

        if (data) {

          for (const log of data.logs) {

            //console.log(c.yellow(JSON.stringify(log)));

            const message = log.message;
            let m;

            try {

              if ('status' === log.type && message.match(/Agent restarted/)) {
                // agent restarted
                stopSession = this._onLogMessage('AGENT_RESTARTED');
              } else if ('status' === log.type && (m = message.match(/([\d\.]+%) program storage used/))) {
                // code space used
                stopSession = this._onLogMessage('DEVICE_CODE_SPACE_USAGE', m[1]);
              } else if (typeFilter === log.type && message.match(/__IMPUNIT__/)) {
                // impUnit message, decode it
                stopSession = this._onLogMessage('IMPUNIT', JSON.parse(message));
              }

            } catch (e) {
              stopSession = this._onError(e);
            }

            // are we done?
            if (stopSession) {
              ee.emit('done');
              break;
            }
          }

        } else {
          // we're connected
          ee.emit('ready');
        }

        return !stopSession;
      })

      .catch((e) => {
        this._onError(e);
        ee.emit('error', {error: e});
      });

    return ee;
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

            this._onError(new TestMethodError(message.message));
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
              this._onError(new SessionFailedError('Session failed'));
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

    if (error instanceof TestMethodError) {
      this._debug('error instanceof TestCaseError === true');
      this._testLine(c.red('Error: ' + error.message));
      stop = false;
    } else if (error instanceof TestStateError) {
      this._debug('error instanceof TestStateError === true');
      this._error(error);
      stop = true;
    } else if (error instanceof SessionFailedError) {
      this._debug('error instanceof SessionFailedError === true');
      this._testLine(c.red(error.message));
      stop = !!this._config.values.stopOnFailure;;
    } else if (error instanceof Error) {
      this._debug('error instanceof Error === true');
      this._error(error.message);
      process.exit(1);
    } else {
      this._debug('Unknown error type');
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
    console.log(c.gray(''));
  }
}

module.exports = TestCommand;
