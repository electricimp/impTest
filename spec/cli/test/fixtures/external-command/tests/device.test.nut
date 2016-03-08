class TestCase extends ImpTestCase {
  function test01() {
    this.externalCommand("ls -la; sleep 1; exit 1");
    this.assertTrue(false);
  }
}
