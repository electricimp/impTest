// @see https://github.com/electricimp/Promise
#require "promise.class.nut:1.0.0"

/**
 * JSON encoder. Decoder is coming.
 * @author Mikhail Yurasov <mikhail@electricimp.com>
 * @verion 0.0.1
 */
JSON <- {

  version = [0, 0, 1],

  /**
   * Encode value to JSON
   * @param {table|array} val
   * @returns {string}
   */
  stringify = function (value) {
    return JSON._encode(value, true, type(value) == "array");
  },

  /**
   * @param {table|array} val
   * @param {bool} _isRoot
   * @param {bool} _isArray
   * @private
   */
 _encode = function (val, _isRoot = true, _isArray = false) {

    local r = "";

    foreach (key, value in val) {

      if (!_isArray) {
        (r += "\"" + key + "\":");
      }

      switch (type(value)) {

        case "table":
          r += "{\n" + JSON._encode(value, false) + "}";
          break

        case "array":
          r += "[" + JSON._encode(value, false, true) + "]";
          break

        case "string":
          r += "\"" + value + "\"";
          break;

        case "integer":
        case "float":
        case "bool":
          r += value;
          break;

        case "null":
          r += "null";
          break;

        default:
          r += "\"" + value + "\"";
          break;
      }

      r += ",";
    }

    r = r.slice(0, r.len() - 1);

    if (_isRoot) {
      if (_isArray) {
        return "[" + r + "]";
      } else {
        return "{" + r + "}";
      }
    } else {
      return r;
    }
  }
}

// test is executed by impTest tool
IMP_TEST_TOOL <- true;

/**
 * Base for test cases
 */
class ImpTestCase {

  constructor() {}

  /**
   * Setup test case
   * Can be async
   * @return {Promise|*}
   */
  function setUp() {}

  /**
   * Teardown test case
   * Can be async
   * @return {Promise|*}
   */
  function tearDown() {
  }
}

/**
 *
 */
class TestCase1 extends ImpTestCase {

  function setUp() {
    // async version
    return Promise(function (resolve, reject){
      resolve("something useful");
    }.bindenv(this));
  }

  function testSomethingSync() {
    //
  }

  function testSomethingAsync() {
    // async version
    return Promise(function (resolve, reject){
      imp.wakeup(2 /* 2 seconds */, function () {
        resolve("something useful");
      }.bindenv(this));
    }.bindenv(this));
  }
}

// impTest message types
enum ImpTestMessageTypes {
  result = "RESULT",
  debug = "DEBUG",
  status = "STATUS"
}

/**
 * Test message
 */
class ImpTestMessage {

  type = "";
  message = "";

  /**
   * @param {ImpTestMessageTypes} type - Message type
   * @param {string} message - Message
   */
  constructor(type, message = "") {
    this.type = type;
    this.message = message;
  }

  /**
   * Convert message to JSON
   */
  function toJSON() {
    return JSON.stringify({
      __IMP_TEST_MESSAGE__ = true,
      type = this.type,
      message = this.message
    });
  }

  /**
   * Convert to human-readable string
   */
  function _tostring() {
    return "[impTest:" + this.type + "] "
      + this.message;
  }
}

class ImpTestRunner {

  testFunctions = null;

  constructor() {
    this.testFunctions = this._getTestFunctions();
  }

  /**
   * Determine if the test is executed by test tool
   */
  function _isExecutedFromTestTool() {
    return "IMP_TEST_TOOL" in getroottable()
      && getroottable()["IMP_TEST_TOOL"] == true;
  }

  /**
   * Log message
   * @parame {ImpTestMessage} message
   */
  function _log(message) {
    if (this._isExecutedFromTestTool()) {
      server.log(message.toJSON());
    } else {
      server.log(message)
    }
  }

  /**
   * Loog for test cases/test functions
   * @returns {generator}
   */
  function _getTestFunctions() {

    // iterate through the
    foreach (rootKey, rootValue in getroottable()) {

      if (type(rootValue) == "class" && rootValue.getbase() == ImpTestCase) {

        // create instance of the test class
        local testInstance = rootValue();

        // log setUp() execution
        this._log(ImpTestMessage(ImpTestMessageTypes.status, rootKey + "::setUp()"));

        // yield setUp method
        yield testInstance.setUp.bindenv(testInstance);

        // iterate through members of test class
        foreach (memberKey, memberValue in rootValue) {
          // we need test* methods
          if (memberKey.len() >= 4 && memberKey.slice(0, 4) == "test") {
            // log test method execution
            this._log(ImpTestMessage(ImpTestMessageTypes.status, rootKey + "::" + memberKey + "()"));

            // execute yield test method
            yield memberValue.bindenv(testInstance);
          }
        }


        // log tearDown() execution
        this._log(ImpTestMessage(ImpTestMessageTypes.status, rootKey + "::tearDown()"));

        // yield tearDown method
        yield testInstance.tearDown.bindenv(testInstance);
      }

    }

    // we're done
    return null;
  }

  /**
   * Run tests
   */
  function run() {
    local testMethod = resume this.testFunctions;

    if (testMethod) {

      // do GC before each
      collectgarbage();

      local result;

      // run test method
      try {
        result = testMethod();
      } catch (e) {
        // todo: report error
        // todo: add setting to stop on failure
      }

      if (result instanceof Promise) {

        result
          .then(function (e) {
            this.run.bindenv(this)();
          }.bindenv(this))
          .fail(function (e) {
            // todo: report error
            // todo: add setting to stop on failure
            this.run();
          });

      } else {

        // next function
        this.run();
      }

    }
  }
}

ImpTestRunner().run();

