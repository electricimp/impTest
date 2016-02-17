'use strict';

/**
 * While loop with promises
 * @param {function} condition
 * @param {function} action
 * @return {Priomise}
 */
module.exports = function promiseWhile(condition, action) {
  const resolver = Promise.defer();

  const loop = () => {
    if (!condition()) {
      return resolver.resolve();
    }

    return Promise.resolve(action())
      .then(loop)
      .catch(resolver.reject);
  };

  process.nextTick(loop);

  return resolver.promise;
};
