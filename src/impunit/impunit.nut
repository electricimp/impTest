// @see https://github.com/electricimp/Promise
#require "promise.class.nut:1.0.0"

/**
 * ImpUnit
 * Imp testing framework
 * @author Mikhail Yurasov <mikhail@electricimp.com>
 */

/**
 * JSON encoder.
 * @author Mikhail Yurasov <mikhail@electricimp.com>
 * @verion 0.2.0
 */
JSON <- {

  version = [0, 2, 0],

  // max structure depth
  // anything above probably has a cyclic ref
  _maxDepth = 32,

  /**
   * Encode value to JSON
   * @param {table|array|*} value
   * @returns {string}
   */
  stringify = function (value) {
    return JSON._encode(value);
  },

  /**
   * @param {table|array} val
   * @param {integer=0} depth – current depth level
   * @private
   */
  _encode = function (val, depth = 0) {

    // detect cyclic reference
    if (depth > JSON._maxDepth) {
      throw "Possible cyclic reference";
    }

    local
      r = "",
      s = "",
      i = 0;

    switch (type(val)) {

      case "table":
      case "class":
        s = "";

        foreach (k, v in val) {
          if ("_serialize" != k) {
            s += ",\"" + k + "\":" + JSON._encode(v, depth + 1);
          }
        }

        s = s.len() > 0 ? s.slice(1) : s;
        r += "{" + s + "}";
        break;

      case "array":
        s = "";

        for (i = 0; i < val.len(); i++) {
          s += "," + JSON._encode(val[i], depth + 1);
        }

        s = (i > 1) ? s.slice(1) : s;
        r += "[" + s + "]";
        break;

      case "integer":
      case "float":
      case "bool":
        r += val;
        break;

      case "string":
        r += "\"" + this._escape(val) + "\"";
        break;

      case "null":
        r += "null";
        break;

      case "instance":
        if ("_serialize" in val && type(val._serialize) == "function") {
          r += JSON._encode(val._serialize());
        }
        break;

      default:
        r += "\"" + val + "\"";
        break;
    }

    return r;
  },

  /**
   * Escape strings according to http://www.json.org/ spec
   * @param {string} str
   */
  _escape = function (str) {
    local res = "";

    for (local i = 0; i < str.len(); i++) {

      local ch1 = (str[i] & 0xFF);

      if ((ch1 & 0x80) == 0x00) {
        // 7-bit Ascii

        ch1 = format("%c", ch1);

        if (ch1 == "\"") {
          res += "\\\"";
        } else if (ch1 == "\\") {
          res += "\\\\";
        } else if (ch1 == "/") {
          res += "\\/";
        } else if (ch1 == "\b") {
          res += "\\b";
        } else if (ch1 == "\f") {
          res += "\\f";
        } else if (ch1 == "\n") {
          res += "\\n";
        } else if (ch1 == "\r") {
          res += "\\r";
        } else if (ch1 == "\t") {
          res += "\\t";
        } else {
          res += ch1;
        }

      } else {

        if ((ch1 & 0xE0) == 0xC0) {
          // 110xxxxx = 2-byte unicode
          local ch2 = (str[++i] & 0xFF)
          res += format("%c%c", ch1, ch2);
        } else if ((ch1 & 0xF0) == 0xE0) {
          // 1110xxxx = 3-byte unicode
          local ch2 = (str[++i] & 0xFF)
          local ch3 = (str[++i] & 0xFF)
          res += format("%c%c%c", ch1, ch2, ch3);
        } else if ((ch1 & 0xF8) == 0xF0) {
          // 11110xxx = 4 byte unicode
          local ch2 = (str[++i] & 0xFF)
          local ch3 = (str[++i] & 0xFF)
          local ch4 = (str[++i] & 0xFF)
          res += format("%c%c%c%c", ch1, ch2, ch3, ch4);
        }

      }
    }

    return res;
  }
}

// test is executed by impTest tool
IMP_TEST_TOOL <- true;

/**
 * Base for test cases
 */
class ImpTestCase {

  assertions = 0;

  /**
   * Assert that something is true
   * @param {bool} condition
   * @param {string|false} message
   */
  function assertTrue(condition, message = false) {
    this.assertions++;
    if (!condition) {
      throw message ? message : "Failed to assert that condition is true";
    }
  }

  /**
   * Assert that two values are equal
   * @param {bool} condition
   * @param {string|false} message
   */
   function assertEqual(expected, actual, message = false) {
    this.assertions++;
    if (expected != actual) {
      throw message ? message : "Expected value: " + expected + ", got: " + actual;
    }
  }

  /**
   * Assert that two values are within a certain range
   * @param {bool} condition
   * @param {string|false} message
   */
  function assertClose(expected, actual, maxDiff, message = false) {
    this.assertions++;
    if (math.abs(expected - actual) > maxDiff) {
      throw message ? message :
        "Expected value: " + expected + "±" + maxDiff + ", got: " + actual;
    }
  }

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
     this.assertTrue(true);
    // this.assertTrue(false);
     this.assertClose(10, 11, 0.5);
  }

  function testSomethingAsync() {
    // async version
    return Promise(function (resolve, reject){

      this.assertTrue(false);

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
  status = "STATUS",
  fail = "FAIL"
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
      + (typeof this.message == "table"
          ? JSON.stringify(this.message)
          : this.message
        );
  }
}

/**
 * Imp test runner
 */
class ImpTestRunner {

  tests = 0;
  assertions = 0;
  failures = 0;
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
        yield [testInstance, testInstance.setUp.bindenv(testInstance)];

        // iterate through members of test class
        foreach (memberKey, memberValue in rootValue) {
          // we need test* methods
          if (memberKey.len() >= 4 && memberKey.slice(0, 4) == "test") {
            // log test method execution
            this._log(ImpTestMessage(ImpTestMessageTypes.status, rootKey + "::" + memberKey + "()"));

            // yield test method
            yield [testInstance, memberValue.bindenv(testInstance)];
          }
        }

        // log tearDown() execution
        this._log(ImpTestMessage(ImpTestMessageTypes.status, rootKey + "::tearDown()"));

        // yield tearDown method
        yield [testInstance, testInstance.tearDown.bindenv(testInstance)];
      }

    }

    // we're done
    return null;
  }

  /**
   * Run tests
   */
  function run() {

    local test = resume this.testFunctions;

    if (test) {

      local testInstance = test[0];
      local testMethod = test[1];
      local result = null;
      local oldAssertions;

      this.tests++;

      // do GC before each run
      collectgarbage();

      try {
        oldAssertions = testInstance.assertions;
        result = testMethod();
      } catch (e) {
        this.failures++;
        this._log(ImpTestMessage(ImpTestMessageTypes.fail, e));
      }

      if (result instanceof Promise) {

        result
          .then(function (e) {
            // next one
            this.assertions += testInstance.assertions - oldAssertions;
            this.run.bindenv(this)();
          }.bindenv(this))
          .fail(function (e) {
            // next one
            // todo: report error
            // todo: add setting to stop on failure
            this.assertions += testInstance.assertions - oldAssertions;
            this.failures++;
            this._log(ImpTestMessage(ImpTestMessageTypes.fail, e));
            this.run.bindenv(this)();
          }.bindenv(this));


      } else {
        this.assertions += testInstance.assertions - oldAssertions;
        this.run();
      }

    } else {

      this._log(ImpTestMessage(ImpTestMessageTypes.result, {
        tests = this.tests - 2 /* -setUp -tearDown */,
        assertions = this.assertions,
        failures = this.failures
      }));

    }

  }
}

ImpTestRunner().run();

// todo: timeouts for async execution AND/OR global timeout
// todo: add test doc
// todo: more assertion methods
// todo: run standalone test functions
