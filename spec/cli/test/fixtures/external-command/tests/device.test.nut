class TestCase extends ImpTestCase {
  function testExtCommand() {
    this.externalCommand("echo \"external command output\"; exit 125");
  }
}
