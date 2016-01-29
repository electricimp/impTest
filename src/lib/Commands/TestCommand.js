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
var Bundler = require('../Bundler');

class TestCommand extends AbstractCommand {

  /**
   * @returns {{}}
   */
  get defaultOptions() {
    return {
      debug: false,
      config: '.imptest',
      testFrameworkFile: '', // path to test framework main file
      testCaseFile: null // path to test case file, of empty test cases will be searched automatically
    };
  }

  /**
   * Run command
   */
  run() {
    super.run();
    this._test();
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
   * Find test files
   * @returns {[{name, path, type}]}
   * @private
   */
  _findTestFiles() {
    const files = [];
    let configCwd;

    let pushFile = file => {
      files.push({
        name: file,
        path: path.resolve(configCwd, file),
        type: /\bagent\./i.test(file) ? 'agent' : 'device'
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
  _readSoureCode() {
    let sourceFilePath;
    const result = {};

    if (this._config.values.agentFile) {
      sourceFilePath = path.resolve(this._config.dir, this._config.values.agentFile);

      /* [debug] */
      this._debug(colors.blue('Agent source code file path: ') + sourceFilePath);
      /* [info] */
      this._info(colors.blue('Agent source: ')
                 + this._config.values.agentFile);

      result.agent = fs.readFileSync(sourceFilePath, 'utf-8');
    } else {
      result.agent = '';
    }

    if (this._config.values.deviceFile) {
      sourceFilePath = path.resolve(this._config.dir, this._config.values.deviceFile);

      /* [debug] */ this._debug(colors.blue('Device source code file path: ') + sourceFilePath);
      /* [info] */ this._info(colors.blue('Device source: ')
                              + this._config.values.deviceFile);

      result.device = fs.readFileSync(sourceFilePath, 'utf-8');
    } else {
      result.device = '';
    }

    return result;
  }

  /**
   * Read framework code
   * @return {string}
   * @private
   */
  _readFramework() {
    return (new Bundler({debug: this._options.debug}))
      .process(this._options.testFrameworkFile);
  }

  /**
   * Run tests
   * @private
   */
  _test() {

    // find test case files
    const testFiles = this._findTestFiles();

    /* [debug] */
    this._debug(colors.blue('Test files found:'), testFiles);

    /* [info] */
    this._info(colors.blue('Found ') +
               testFiles.length +
               colors.blue(' test file' +
               (testFiles.length === 1 ? '' : 's')) + ': '
               + testFiles.map(e => e.name).join(', ')
    );

    // read source code
    this._sourceCode = this._readSoureCode();

    // run framework code
    this._frameworkCode = this._readFramework();

    // agent

    for (const testFile of testFiles) {
      this._runTestFile(testFile);
    }

    process.exit(0);

    // bundle agent code

    if (this._agentCode) {
      ///* [info] */ this._info(colors.blue('Have agent code'));

      // xxx search for test files
      this._agentTestFilePath = this._agentFilePath.replace(/\/([^\/]+)\.nut$/, '/tests/$1.test.nut');

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
   * Run test file
   * @param {name, path, type} file
   * @private
   */
  _runTestFile(file) {
    /* [info] */
    this._info(colors.blue('Running ') + file.type + colors.blue(' test file ') + file.name);

    // create complete codebase

    let agentCode, deviceCode;

    if ('agent' === file.type) {
      agentCode = this._frameworkCode +'\n\n' +
                  this._sourceCode.agent + '\n\n' +
                  fs.readFileSync(file.path, 'utf-8');
      deviceCode = this._sourceCode.device;
    } else {
      deviceCode = this._frameworkCode +'\n\n' +
                  this._sourceCode.device + '\n\n' +
                  fs.readFileSync(file.path, 'utf-8');
      agentCode = this._sourceCode.agent;
    }

    this._info(colors.blue('Agent code size: ') + agentCode.length + ' bytes');
    this._info(colors.blue('Device code size: ') + deviceCode.length + ' bytes');
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

  /**
   * Prints log message
   * @param line
   * @private
   */
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
   * Print [test] message
   * @param {*} ...objects
   * @protected
   */
  _testPrint() {
    this._log('test', colors.grey, arguments);
  }
}

module.exports = TestCommand;
