/**
 * Session errors
 *
 * @author Mikhail Yurasov <mikhail@electricimp.com>
 */

'use strict';

module.exports.AgentRuntimeError = class AgentRuntimeError extends Error {
  constructor(message, id) {
    super(message || 'Agent runtime error', id);
  }
};

module.exports.DeviceDisconnectedError = class DeviceDisconnectedError extends Error {
  constructor(message, id) {
    super(message || 'Device disconnected', id);
  }
};

module.exports.DeviceError = class DeviceError extends Error {
  constructor(message, id) {
    super(message || 'Device error', id);
  }
};

module.exports.DeviceRuntimeError = class DeviceRuntimeError extends Error {
  constructor(message, id) {
    super(message || 'Device runtime error', id);
  }
};

module.exports.SessionFailedError = class SessionFailedError extends Error {
  constructor(message, id) {
    super(message || 'Session failed', id);
  }
};

module.exports.TestMethodError = class TestMethodError extends Error {
  constructor(message, id) {
    super(message || 'Test method failed', id);
  }
};

module.exports.TestStateError = class TestStateError extends Error {
  constructor(message, id) {
    super(message || 'Invalid test session state', id);
  }
};

