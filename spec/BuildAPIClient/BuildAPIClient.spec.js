'use strict';

var config = require('../config');
var BuildAPIClient = require('../../src/lib/BuildAPIClient');
var parseBool = require('../../src/lib/utils/parseBool');

describe('BuildAPIClient test suite', () => {

  let client;
  let modelId;
  let deviceId;

  beforeEach(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;
    client = new BuildAPIClient();
    client.apiKey = config.build_api_key;
    client.debug = parseBool(process.env.SPEC_DEBUG);
  });

  it('should get list a of devices', (done) => {

    client.getDevices()
      .then((res) => {
        expect(res.devices.length).toBeGreaterThan(0);
        deviceId = res.devices[0].id;
        done();
      })
      .catch((error) => {
        done.fail(error);
      });

  });

  it('should get a device', (done) => {

    client.getDevice(deviceId)
      .then((res) => {
        expect(res.device.id).toBe(deviceId);
        done();
      })
      .catch((error) => {
        done.fail(error);
      });

  });

  it('should get list a of models', (done) => {

    client.getModels()
      .then((res) => {
        expect(res.models.length).toBeGreaterThan(0);
        modelId = res.models[0].id;
        done();
      })
      .catch((error) => {
        done.fail(error);
      });

  });

  it('should get a model', (done) => {

    client.getModel(modelId)
      .then((res) => {
        expect(res.model.id).toBe(modelId);
        done();
      })
      .catch((error) => {
        done.fail(error);
      });

  });

  it('should push a new revision', (done) => {

    client.createRevision(
        config.model_id,
        `server.log("hi there from device @ ${(new Date()).toUTCString()}")`,
        `w <- function() { server.log("Now: " + time()); imp.wakeup(0.2, w); } w();`
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

  it('should stream device logs', (done) => {

    let n = 0;

    client.streamDeviceLogs(config.device_id, function (data) {
      return ++n < 5;
    }).then(() => {
      expect(n).toBe(5);
      done();
    }).catch(done.fail);

  });

});
