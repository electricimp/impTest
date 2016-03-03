/**
 * Agent-only tests
 */

'use strict';

require('jasmine-expect');
const run = require('./run');

describe('TestCommand test suite for agent-only scenario', () => {
  let commandOut = '',
    commandSuccess = true;

  beforeEach(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;
  });

  it('should run a command', (done) => {
    run({
      configPath:  '/fixtures/agent-only/.imptest',
      testCaseFile:  '/fixtures/agent-only/tests/agent.test.nut'
    }).then((res) => {
      commandSuccess = res.success;
      commandOut = res.out;
      done();
    });
  });

  it('should verify the output', (done) => {
    // todo: insert more checks here
    expect(commandSuccess).toBe(true);
    expect(commandOut).not.toBeEmptyString();
    expect(commandOut).toMatch(/Test session is agent-only\n/);
    done();
  });
});
