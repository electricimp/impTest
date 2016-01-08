'use strict';

var config = require('../config');
var BuildAPIClient = require('../../src/lib/BuildAPIClient');

describe('BuildAPIClient test suite', () => {

  const client = new BuildAPIClient({
    debug: true,
    apiKey: config.build_api_key
  });

  it('should get list a of devices', (done) => {

    client.request('GET', '/devices')
      .then(done)
      .catch((error) => {
        done.fail(error);
      });

  });

  it('should push a new revision', (done) => {

    client.createRevision(
        config.model_id,
        `server.log("hi there from device @ ${(new Date()).toUTCString()}")`,
        `server.log("hi there from agent @ ${(new Date()).toUTCString()}")`
      )
      .then(done)
      .catch((error) => {
        done.fail(error);
      });

  });

  it('should restart the model', (done) => {

    client.restartModel(
        config.model_id
      )
      .then(done)
      .catch((error) => {
        done.fail(error);
      });

  });

});
