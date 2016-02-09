/**
 * Error happened on imp, such as "out of memory", etc.
 */

'use strict';

class DeviceError extends Error {}

module.exports = DeviceError;
