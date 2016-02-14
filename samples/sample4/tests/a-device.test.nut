// test file

class Case extends ImpUnitCase {
  function testSomethingSync() {
    this.assertTrue(true);
  }

  function testSomethingAsync() {
    return Promise(function(ok, err) {
      imp.wakeup(4, function() {
        ok();
      }.bindenv(this));
    });
  }
}
