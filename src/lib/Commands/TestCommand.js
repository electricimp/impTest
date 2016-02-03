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
var randomstring = require('randomstring');

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

    /* [blank] */
    this._blankLine();

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

    if (this._options.testCaseFile) {
      // test file is passed via cli

      // look in the current path
      configCwd = path.resolve('.');

      if (!fs.existsSync(this._options.testCaseFile)) {
        throw new Error('File "' + this._options.testCaseFile + '" not found');
      }

      pushFile(this._options.testCaseFile);

    } else {
      // look through .imptest.tests glob(s)

      // look in config file directory
      configCwd = this._config.dir;

      let searchPatterns = this._config.values.tests;

      if (typeof searchPatterns === 'string') {
        searchPatterns = [searchPatterns];
      }

      for (const searchPattern of searchPatterns) {
        for (const file of glob.sync(searchPattern, {cwd: configCwd})) {
          pushFile(file);
        }
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
        ;
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
    /* [info] */
    this._info(c.blue('Running ') + file.type + c.blue(' test file ') + file.name);

    // create complete codebase

    // test session id, unique per every test file run
    this._testSessionId = randomstring.generate(10);

    // bootstrap code
    const bootstrapCode =
      `
// run tests
imp.wakeup(${parseFloat(this._options.startTimeout) /* prevent log sessions mixing */}, function() {
  local t = ImpUnitRunner();
  t.readableOutput = false;
  t.session = "${this._testSessionId}";
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

    // initialize test state machine
    this._testState = 'ready';

    // start reading logs
    this._readLogs(type, this._config.values.devices[0])

      .then(() => {
        return client.createRevision(this._config.values.modelId, deviceCode, agentCode);
      })

      .then((body) => {
        this._revision = body.revision;
        /* [info] */
        this._info(c.blue('Created revision: ') + this._revision.version);
        return client.restartModel(this._config.values.modelId);
      })

      .catch((error) => {
        this._error(error.message);
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
  _readLogs(test, deviceId, since) {
    return new Promise((resolve, reject) => {
      this._getBuildApiClient().streamDeviceLogs(deviceId, (data) => {

        if (data) {

          for (const log of data.logs) {

            let message = log.message;
            let m;

            try {

              if (message.match(/Agent restarted/)) {
                // agent restarted
                this._onLogMessage('AGENT_RESTARTED');
              } else if (m = message.match(/([\d\.]+%) program storage used/)) {
                // code space used
                this._onLogMessage('DEVICE_CODE_SPACE_USAGE', m[1]);
              } else if (message.match(/__IMPUNIT__/)) {
                // impUnit message, decode it
                this._onLogMessage('IMPUNIT', JSON.parse(message));
              }

            } catch (e) {
              // cannot reject, promise has been resolved already on getting poll url
              this._error(e.message);
              return false;
            }

            console.log(c.magenta(JSON.stringify(log)));
          }
        } else {
          // empty data means we're connected
          resolve();
        }

        return true; // continue

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

    switch (type) {

      case 'AGENT_RESTARTED':
        break;

      case 'DEVICE_CODE_SPACE_USAGE':
        this._info(c.blue('Device code space usage: ') + message);
        break;

      case 'IMPUNIT':

        if (message.session !== this._testSessionId) {
          // skip messages not from the current session
          // ??? should an error be thrown?
          break;
        }

        switch (message.type) {
          case 'START':

            if (this._testState !== 'ready') {
              throw new Error('Invalid test session state');
            }

            this._testState = 'started';
            break;

          case 'STATUS':

            if (this._testState !== 'started') {
              throw new Error('Invalid test session state');
            }

            if (m = message.message.match(/(.+)::setUp\(\)$/)) {
              // setup
              this._testLine(c.blue('Setting up ') + m[1]);
            }

            break;

          case 'RESULT':

            if (this._testState !== 'started') {
              throw new Error('Invalid test session state');
            }

            this._testState = 'finished';
            break;

          default:
            break;
        }

        break;

      default:
        break;
    }
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
