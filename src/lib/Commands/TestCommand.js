/**
 * Test command
 */

'use strict';

var fs = require('fs');
var path = require('path');
var glob = require('glob');
var colors = require('colors');
var AbstractCommand = require('./AbstractCommand');
var BuildAPIClient = require('../BuildAPIClient');

class TestCommand extends AbstractCommand {

  /**
   * @returns {{}}
   */
  get defaultOptions() {
    return {
      debug: false,
      config: '.imptest',
      agent: true,
      device: true,
      testFrameworkFile: '', // path to test framework main file
      testCaseFile: null // path to test case file, of empty test cases will be searched automatically
    };
  }

  /**
   * Run command
   */
  run() {
    super.run();
    this._runTest();
  }

  /**
   * @returns {BuildAPIClient}
   * @private
   */
  _createBuildApiClient() {
    return new BuildAPIClient({
      debug: this._options.debug,
      apiKey: this._config.values.apiKey
    });
  }

  /**
   * Read agent/device source code
   * @private
   */
  _readCode() {

    // read agent code
    if (this._options.agent && !!this._config.values.agentFile) {
      this._agentFilePath = path.resolve(this._config.values.agentFile);
      this._agentCode = fs.readFileSync(this._agentFilePath, 'utf8');
      this._debug(colors.blue('Using agent code file:'), this._agentFilePath);
    }

    // read device code
    if (this._options.device && !!this._config.values.deviceFile) {
      this._deviceFilePath = path.resolve(this._config.values.deviceFile);
      this._deviceCode = fs.readFileSync(this._deviceFilePath, 'utf8');
      this._debug(colors.blue('Using device code file:'), this._deviceFilePath);
    }
  }

  /**
   * @returns {{agent:[],device:[]}}
   * @private
   */
  _findTestFiles() {
    let agent = [];
    let device = [];
    let configCwd;

    let pushFile = file => {
      const res = {
        name: file,
        path: path.resolve(configCwd, file)
      };
      //
      if (/\bagent\./i.test(file)) {
        // assume this is for agent
        agent.push(res);
      } else {
        // assume this is for device
        device.push(res);
      }
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
      configCwd = path.dirname(this._config.path);

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

    return {
      agent,
      device
    };
  }

  /**
   * Run test
   * @private
   */
  _runTest() {

    // find test case files
    let testFiles = this._findTestFiles();
    /* [debug] */ this._debug(colors.blue('Test files found:'), testFiles);

    /* [info] */
    const testFilesCount = testFiles.agent.length + testFiles.device.length;
    this._info(colors.blue('Found ') + testFilesCount + colors.blue(' test file' + (testFilesCount === 1 ? '' : 's')));

    process.exit(0);

    // !!! continue from here !!!

    /* [info] */
    this._info(colors.blue('Reading the code...'));

    this._readCode();

    // read test framework code
    this._testFrameworkCode = fs.readFileSync(this._options.testFrameworkFile, 'utf-8');

    // bundle agent code

    if (this._agentCode) {
      ///* [info] */ this._info(colors.blue('Have agent code'));

      // xxx search for test files
      this._agentTestFilePath = this._agentFilePath.replace(/\/([^\/]+)\.nut$/, '/tests/$1.test.nut');
      //
      if (!fs.existsSync(this._agentTestFilePath)) {
        this._agentTestFilePath = this._agentFilePath.replace(/\/([^\/]+)\.nut$/, '/$1.test.nuts');
      }

      // check if the code exists
      if (!fs.existsSync(this._agentTestFilePath)) {
        this._error('Code not found');
        process.exit(1);
      }

      this._agentTestCode = fs.readFileSync(this._agentTestFilePath, 'utf-8');

      this._agentCode = '// AGENT CODE:\n\n' + this._agentCode
                        + '\n// TEST FRAMEWORK:\n\n' + this._testFrameworkCode
                        + '\n// TEST CASES:\n\n' + this._agentTestCode;

      // add bootstrap commands
      this._agentCode += `
        // run test
        testRunner <- ImpUnitRunner();
        testRunner.asyncTimeout = 5;
        testRunner.readableOutput = false;
        testRunner.stopOnFailure = false;
        testRunner.run();
      `;
    }

    // run tests

    this._client = this._createBuildApiClient();
    this._logs = {/* ts: message */};

    this._client.createRevision(this._config.values.modelId, this._deviceCode, this._agentCode)

      .then((body) => {
        this._revision = body.revision;
        /* [info] */
        this._info(colors.blue('Created revision: ') + this._revision.version);
        return this._client.restartModel(this._config.values.modelId);
      })

      .then(() => {
        // get logs since current revision was created
        return this._client.getDeviceLogs(this._config.values.devices[0], this._revision.created_at);
      })

      // now read logs
      .then(() => {
        this._readLogs('agent.log'); // !!! also read device logs
      })

      .catch((error) => {
        this._error(error.message);
        process.exit(1);
      });

  }

  /**
   * Read logs
   * @private
   */
  _readLogs(type) {
    this._client.getDeviceLogs(this._config.values.devices[0], this._revision.created_at).then((val) => {

      let done = false;
      let failed = false;

      // parse log messages
      for (const message of val.logs) {

        // filter agent/device messages
        if (message.type === type) {
          const hash = JSON.stringify(message);

          if (!this._logs[hash]) {
            const line = JSON.parse(message.message);
            this._printLogLine(line);

            if (line.type === 'FAIL') {
              this._testPrint(colors.red('FAILED: ' + line.message));
              failed = true;
            } else if (line.type === 'RESULT') {
              done = true;

              const result = 'tests: ' + line.message.tests + ', '
                             + 'assertions: ' + line.message.assertions + ', '
                             + 'failures: ' + line.message.failures;

              if (failed) {
                this._testPrint(colors.red('Testing failed (' + result + ')'));
              } else {
                this._testPrint(colors.green('Testing succeeded (' + result + ')'));
              }
            }

            this._logs[hash] = line;
          }
        }

      }

      if (!done) {
        setTimeout(() => {
          this._readLogs(type);
        }, 1000);
      } else {
        if (failed) {
          process.exit(1 /* error */);
        } else {
          process.exit(0 /* just fine */);
        }
      }
    });
  }

  _printLogLine(line) {
    if (line.type === 'STATUS') {
      if (line.message.indexOf('::setUp()') !== -1) {
        this._testPrint(colors.blue('Setting up ') + line.message.replace(/::.*$/, ''));
      } else if (line.message.indexOf('::tearDown()') !== -1) {
        this._testPrint(colors.blue('Tearing down ') + line.message.replace(/::.*$/, ''));
      } else {
        this._testPrint(line.message);
      }
    }
  }

  /**
   * Test message
   * @param {*} ...objects
   * @protected
   */
  _testPrint() {
    this._log('test', colors.grey, arguments);
  }
}

module.exports = TestCommand;
