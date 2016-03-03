/**
 * Agent-only tests
 */

'use strict';

require('jasmine-expect');
const c = require('colors');
const packageJson = require('../../package.json');
const TestCommand = require('../../src/lib/Commands/TestCommand');
const interceptStdout = require('intercept-stdout');

describe('TestCommand test suite for agent-only scenario', () => {
  let commandOut = '', commandSuccess = true;

  beforeEach(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;
  });

  // todo: extract command creation/run
  it('should run a command', (done) => {

    // create command
    const command = new TestCommand();
    command.version = packageJson.version;
    command.debug = false;
    command.testFrameworkFile = __dirname + '/../../src/impUnit/index.nut';
    // todo: update device/model from tests config or use single config
    command.configPath = __dirname + '/fixtures/agent-only/.imptest';
    command.testCaseFile = __dirname + '/fixtures/agent-only/tests/agent.test.nut';

    console.log(c.inverse('======== command start ========'));

    const unHook = interceptStdout(txt => {
      commandOut += txt;
    });

    const onDone = (success) => {
      unHook();
      console.log(c.inverse('========= command end ========='));
      commandSuccess = success;
      done();
    };

    command.run().then(() => onDone(true), () => onDone(false));
  });

  it('should do something', (done) => {
    // todo: insert more checks here
    expect(commandOut).not.toBeEmptyString();
    expect(commandSuccess).toBe(true);
    done();
  });
});
