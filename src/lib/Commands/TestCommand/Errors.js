/**
 * Test command errors
 * @author Mikhail Yurasov <mikhail@electricimp.com>
 */

'use strict';

module.exports.WrongModelError = class WrongModelError extends Error {
  constructor(message, id) {
    super(message || 'Device is assigned to a wrong model', id);
  }
};

module.exports.DevicePowerstateError = class DevicePowerstateError extends Error {
  constructor(message, id) {
    super(message || 'Device is in the wrong powerstate', id);
  }
};

module.exports.SessionStartTimeoutError = class SessionStartTimeoutError extends Error {
  constructor(message, id) {
    super(message || 'Session startup timeout', id);
  }
};

module.exports.SesstionTestMessagesTimeoutError = class SesstionTestMessagesTimeoutError extends Error {
  constructor(message, id) {
    super(message || 'Testing timeout', id);
  }
};
