// test file

class Case extends ImpTestCase {
  function testSomethingSync() {
    this.assertTrue(true);

        local s = "123";
        while(1) {
          s+=s;
        }
  }

  function testSomethingAsync() {
    return Promise(function(ok, err) {
      imp.wakeup(1, function() {
        ok();
      }.bindenv(this));
    });
  }
}
