'use strict';

var config = require('../config');
var BuildAPIClient = require('../../src/lib/BuildAPIClient');
var parseBool = require('../../src/lib/utils/parseBool');

describe('BuildAPIClient test suite', () => {

  let client;
  let device;
  let model;

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
        device = res.devices[0];
        done();
      })
      .catch((error) => {
        done.fail(error);
      });

  });

  it('should get a device', (done) => {

    client.getDevice(device.id)
      .then((res) => {
        expect(res.device.id).toBe(device.id);
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
        model = res.models[0];
        done();
      })
      .catch((error) => {
        done.fail(error);
      });

  });

  it('should get a model', (done) => {

    client.getModel(model.id)
      .then((res) => {
        expect(res.model.id).toBe(model.id);
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

  it('should restart a device', (done) => {

    client.restartDevice(config.device_id)
      .then(done, done.fail);

  });

  it('should update a device', (done) => {

    let oldName;
    const newName = 'dev_'
                    + parseInt(Math.random() * 1e6).toString()
                    + parseInt(Math.random() * 1e6).toString();

    client.getDevice(config.device_id)
      .then((res) => oldName = res.device.name)
      .then(() => client.updateDevice(config.device_id, newName))
      .then(() => client.getDevice(config.device_id))
      .then((res) => expect(res.device.name).toBe(newName))
      .then(() => client.updateDevice(config.device_id, oldName))
      .then((res) => expect(res.device.name).toBe(oldName))
      .then(done, done.fail);
  });
});
