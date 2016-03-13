class TestCase1 extends ImpTestCase {
  function testThatPromiseComesFromModule() {
    // Promise class here should be the one defined NOT in the agent code, but in ImpUnit_Promise module
    this.assertTrue("isPending" in Promise);
    this.assertTrue(!("abc" in Promise));

    // ::Promise class here should be the one defined in the agent code, but NOT in ImpUnit_Promise module
    this.assertTrue("abc" in ::Promise);
  }
}
