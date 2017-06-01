// MIT License
//
// Copyright 2016 Electric Imp
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

'use strict';

const Watchdog = require('../src/lib/Watchdog');

describe('Watchdog test suite', () => {

  let w;

  beforeEach(() => {
    w = new Watchdog();
  });

  it('should emit timeout event in specified time', (done) => {

    let tId;

    w.timeout = 0.5;
    w.start();

    // this should be cancelled in 0.5s
    tId = setTimeout(() => {
      done.fail();
    }, 555);

    w.on('timeout', () => {
      clearTimeout(tId);
      done();
    });

  });

  it('should stop watchdog timer', (done) => {

    w.timeout = 0.5;
    w.start();

    // this should cancel watchdog
    setTimeout(() => {
      w.stop();
    }, 444);

    w.on('timeout', () => {
      done.fail();
    });

    // done
    setTimeout(done, 555);
  });

  it('should restart watchdog timer', (done) => {

    const start = new Date();

    w.timeout = 0.5;
    w.start();

    setTimeout(() => {
      w.reset();
    }, 250);

    w.on('timeout', () => {
      const passed = (new Date()) - start;

      if (passed < 700) {
        done.fail('Timer has not been restarted');
      } else {
        done();
      }
    });

  });
});
