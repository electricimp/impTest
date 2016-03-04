/**
 * Test for build-api-error behavior
 */

'use strict';

require('jasmine-expect');
const run = require('./run');

describe('TestCommand test suite for build-api-error behavior', () => {
  let commandOut = '',
    commandSuccess = true;

  beforeEach(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;
  });

  it('should run a command', (done) => {
    run({
      configPath:  '/fixtures/build-api-error/.imptest'
    }).then((res) => {
      commandSuccess = res.success;
      commandOut = res.out;
      done();
    });
  });

  it('should verify the output', (done) => {
    expect(commandSuccess).toBe(false);
    expect(commandOut).not.toBeEmptyString();

    // verify that "CompileFailed" error occured
    expect(commandOut).toMatch(/CompileFailed/);

    // verify that 2 sessions started
    // which means that BuilAPI error has not stopped the command
    expect(commandOut).toMatch(/Using device test file tests\/1\-device\.test\.nut\n/);
    expect(commandOut).toMatch(/Using device test file tests\/2\-device\.test\.nut\n/);

    done();
  });
});
