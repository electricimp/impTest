// test file

class Case extends ImpTestCase {
  function testSomethingSync() {
    this.assertEqual(
      1,
      2,
      "Failed to assert that values are"
        + " equal in '#{__FILE__}'"
        + " at line #{__LINE__}"
    );
  }
}
