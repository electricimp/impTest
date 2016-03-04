'use strict';

module.exports.cli = {
  deviceIds: process.env.SPEC_DEVICE_ID
    ? [process.env.SPEC_DEVICE_ID]
    : (process.env.SPEC_DEVICE_IDS || '').split(','),
  modelId: process.env.SPEC_MODEL_ID
};
