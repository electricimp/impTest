/**
 * BuildAPIClient errors
 */

'use strict';

class BuildAPIError extends Error {
  constructor(message, id) {
    super(message || 'Build API error', id);
  }
}

class TimeoutError extends BuildAPIError {
  constructor(message, id) {
    super(message || 'Build API timeout error', id);
  }
}

module.exports.BuildAPIError = BuildAPIError;
module.exports.TimeoutError = TimeoutError;
