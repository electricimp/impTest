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

var promiseWhile = require('../../src/lib/utils/promiseWhile');

describe('utils/promiseWhile test suite', () => {

  it('promise loop should execute 10 times', (done) => {
    let i = 0;

    promiseWhile(() => i < 10,
      () => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve(i++);
          }, 50);
        });
      })
      .then(function () {
        expect(i).toBe(10);
        done();
      })
      .catch((err) => {
        done.fail(err);
      });
  });

  it('promise loop should reject correctly on exception', (done) => {
    let i = 0;

    promiseWhile(
      () => true,
      () => {
        return new Promise((resolve, reject) => {
          if (i < 3) {
            resolve(i++);
          } else {
            throw new Error('Some error');
          }
        });
      })
      .then(done.fail)
      .catch((err) => {
        expect(err.message).toBe('Some error');
        expect(i).toBe(3);
        done(err);
      });
  });

  it('promise loop should reject correctly on rejection', (done) => {
    let i = 0;

    promiseWhile(
      () => true,
      () => {
        return new Promise((resolve, reject) => {

          setTimeout(() => {
            if (i < 3) {
              resolve(i++);
            } else {
              reject(new Error('Some error'));
            }
          }, 50);

        });
      })
      .then(done.fail)
      .catch((err) => {
        expect(err.message).toBe('Some error');
        expect(i).toBe(3);
        done(err);
      });
  });

});
