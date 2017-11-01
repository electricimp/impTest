// MIT License
//
// Copyright 2017 Electric Imp
//
// SPDX-License-Identifier: MIT
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO
// EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
// OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
// ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.

// Builder syntax tests

'use strict';

require('jasmine-expect');
const run = require('./run');

describe('TestCommand test server error scenario', () => {
  let commandOut = '',
    commandSuccess = true;

  beforeEach(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;
  });

  it('should run files with agent and device test errors', (done) => {
    run({
      configPath:  '/fixtures/server-error/.imptest',
    }).then((res) => {
      commandSuccess = res.success;
      commandOut = res.out;
      done();
    });
  });

  it('should verify that there is no test failure happen', (done) => {
    expect(commandSuccess).toBe(true);
    expect(commandOut).not.toBeEmptyString();
    expect(commandOut).toMatch(/Testing succeeded\n/);
    done();
  });

  // Negative test cases
  it('Should fail with field does not exist', (done) => {
    run({
      configPath:  '/fixtures/server-error/.imptest_check_failure',
    }).then((res) => {
      commandSuccess = res.success;
      commandOut = res.out;
      done();
    });
  });

  it('check that test failed', (done) => {
    expect(commandSuccess).toBe(false);
    expect(commandOut).not.toBeEmptyString();
    expect(commandOut).toMatch(/Testing failed\n/);
    expect(commandOut).toMatch("the index 'fieldDoesNotExists' does not exist");
    done();
  });

  it('Should fail with unhandled exception', (done) => {
    run({
      configPath:  '/fixtures/server-error/.imptest_check_exception',
    }).then((res) => {
      commandSuccess = res.success;
      commandOut = res.out;
      done();
    });
  });

  it('check that test failed with unhandled exception', (done) => {
    expect(commandSuccess).toBe(false);
    expect(commandOut).not.toBeEmptyString();
    expect(commandOut).toMatch(/Testing failed\n/);
    expect(commandOut).toMatch("unhandled exception");
    done();
  });
});
