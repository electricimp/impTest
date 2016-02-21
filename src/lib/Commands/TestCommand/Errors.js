/**
 * Test command errors
 * @author Mikhail Yurasov <mikhail@electricimp.com>
 */

'use strict';

module.exports.WrongModelError = class WrongModelError extends Error {};
module.exports.DevicePowerstateError = class DevicePowerstateError extends Error {};
module.exports.SessionStartTimeoutError = class SessionStartTimeoutError extends Error {}
module.exports.SesstionTestMessagesTimeoutError = class SesstionTestMessagesTimeoutError extends Error {};
