/**
 * Test for stop-on-faulire behavior
 */

'use strict';

require('jasmine-expect');
const run = require('./run');

describe('TestCommand test suite for stop-on-failure behavior', () => {
  let commandOut = '',
    commandSuccess = true;

  beforeEach(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;
  });

  it('should run a command with .imptest-stop', (done) => {
    run({
      configPath:  '/fixtures/stop-on-failure/.imptest-stop'
    }).then((res) => {
      commandSuccess = res.success;
      commandOut = res.out;
      done();
    });
  });

  it('should verify the output from .imptest-stop', (done) => {
    // todo: insert more checks here
    expect(commandSuccess).toBe(false);
    expect(commandOut).not.toBeEmptyString();
    expect(commandOut).not.toMatch(/Using device test file tests\/2\.device\.test\.nut\n/);
    done();
  });

  it('should run a command with .imptest-nostop', (done) => {
    run({
      configPath:  '/fixtures/stop-on-failure/.imptest-nostop'
    }).then((res) => {
      commandSuccess = res.success;
      commandOut = res.out;
      done();
    });
  });

  it('should verify the output from .imptest-nostop', (done) => {
    // todo: insert more checks here
    expect(commandSuccess).toBe(false);
    expect(commandOut).not.toBeEmptyString();
    expect(commandOut).toMatch(/Using device test file tests\/2\.device\.test\.nut\n/);
    done();
  });
});
