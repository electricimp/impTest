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
          }, 1);
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

});
