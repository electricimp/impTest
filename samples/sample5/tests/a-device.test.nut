// test file

class Case extends ImpTestCase {
  function testSomethingSync() {
    this.assertEqual(
      1,
      2,
      "This should fail to assert that values are"
        + " equal in '@{__FILE__}'"
        + " at line @{__LINE__}"
    );
  }

  function test_assertThrowsError_Success() {
    return this.assertThrowsError(function (...) {
      throw "Internal error thrown"
    }, this);
  }

  function test_assertThrowsError_Failure() {
    return this.assertThrowsError(function (...) {
      // throw "Internal error"
    }, this, [], "This should fail");
  }

  function test_assertDeepEqual() {
    return this.assertDeepEqual({"a" : { "b" : 1 }}, {"a" : { "_b" : 0 }});
  }

  function test_assertDeepEqual2() {
    return this.assertDeepEqual({"a" : { "b" : 1 }}, {"a" : { "b" : 0 }});
  }

  function test_assertGreater() {
    return this.assertGreater(1, 2);
  }

  function test_assertLess() {
    return this.assertLess(20, 2);
  }
}
