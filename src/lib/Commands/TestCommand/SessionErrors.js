/**
 * Session errors
 * 
 * @author Mikhail Yurasov <mikhail@electricimp.com>
 */

'use strict';

module.exports.AgentRuntimeError = class AgentRuntimeError extends Error {};
module.exports.DeviceDisconnectedError = class DeviceDisconnectedError extends Error {};
module.exports.DeviceError = class DeviceError extends Error {};
module.exports.DeviceRuntimeError = class DeviceRuntimeError extends Error {};
module.exports.SessionFailedError = class SessionFailedError extends Error {};
module.exports.TestMethodError = class TestMethodError extends Error {};
module.exports.TestStateError = class TestStateError extends Error {};
