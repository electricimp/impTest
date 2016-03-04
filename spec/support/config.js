'use strict';

module.exports.cli = {
  deviceIds: process.env.SPEC_DEVICE_ID
    ? [process.env.SPEC_DEVICE_ID]
    : (process.env.SPEC_DEVICE_IDS || '').split(','),
  modelId: process.env.SPEC_MODEL_ID,
  debug: process.env.SPEC_DEBUG === '1' || process.env.SPEC_DEBUG === 'true'
};
