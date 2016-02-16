// test file

class Case1 extends ImpTestCase {
  function testSomethingSync() {
    this.assertTrue(true);
    local s = time();
    while(time() - s < 5) {
    }
  }
}

class Case2 extends ImpTestCase {
  function testSomethingSync() {
    this.assertTrue(true);
  }
}
