'use strict';

var config = require('../config');
var BuildAPIClient = require('../../src/lib/BuildAPIClient');
var parseBool = require('../../src/lib/utils/parseBool');

describe('BuildAPIClient test suite', () => {

  const client = new BuildAPIClient({
    debug: parseBool(process.env.SPEC_DEBUG),
    apiKey: config.build_api_key
  });

  beforeEach(function() {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;
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

    client.restartModel(config.model_id)
      .then(done)
      .catch((error) => {
        done.fail(error);
      });

  });

  it('should get device logs', (done) => {

    const since = new Date((new Date()) - 1000 * 60 * 60 /* -1 day */);

    client.getDeviceLogs(config.device_id, since)
      .then((body) => {
        expect(body.logs.length).toBeGreaterThan(0);
        done();
      })
      .catch((error) => {
        done.fail(error);
      });

  });

});
