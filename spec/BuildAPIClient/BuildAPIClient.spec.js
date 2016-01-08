'use strict';

var BuildAPIClient = require('../../src/lib/BuildAPIClient');

describe('BuildAPI test suite', () => {
  it('should get list a of devices', (done) => {

    const client = new BuildAPIClient({
      debug: true,
      apiKey: process.env.IMP_BUILD_API_KEY
    });

    client.request('GET', '/devices')
      .then((body) => {
        done();
      })
      .catch((error) => {
        done.fail(error);
      });

  });
});
