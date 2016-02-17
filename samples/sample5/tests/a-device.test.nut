// test file

class Case extends ImpTestCase {
  function testSomethingSync() {
    this.assertTrue(${__LINE__} == 5);
    this.assertTrue(${__FILE__} == "a-device.test.nut");
  }
}
