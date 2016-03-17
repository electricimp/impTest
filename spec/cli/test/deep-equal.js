/**
 * Agent-only tests
 */

'use strict';

require('jasmine-expect');
const run = require('./run');

describe('TestCommand test suite for deep-equal scenario', () => {
  let out = '';
  let success = true;

  beforeEach(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;
  });

  it('should run a command', (done) => {
    run({
      configPath:  '/fixtures/deep-equal/.imptest'
    }).then((res) => {
      success = res.success;
      out = res.out;
      done();
    });
  });

  it('should verify the output', (done) => {
    expect(success).toBe(false);
    expect(out).not.toBeEmptyString();
    expect(out).toMatch(/Missing slot \[a\.b\.c\] in actual value\n/);
    expect(out).toMatch(/Extra slot \[a\.b\.d\] in actual value\n/);
    expect(out).toMatch(/At \[a\.b\.c\]: expected \"3\", got \"100\"\n/);
    done();
  });
});
