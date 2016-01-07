'use strict';

var BuildAPI = require('../../src/lib/BuildAPIClient');

describe('BuildAPI test suite', function () {
  it('should get list a of devices', function (done) {

    let client = new BuildAPI({
      debug: true,
      apiKey: process.env.IMP_BUILD_API_KEY
    });

    client.request('GET', '/devices', {}, '')
      .then((body) => {
        console.log('Result: ', JSON.stringify(body));
        done();
      })
      .catch((error) => {
        done.fail(error.message_full || error);
      });

  });
});
