'use strict';

var promiseWhile = require('../../src/lib/utils/promiseWhile');

describe('utils/promiseWhile test suite', () => {

  it('promise loop should execute 10 times', function (done) {
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

});
