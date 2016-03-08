class TestCase extends ImpTestCase {
  function testExtCommand() {
    this.runCommand("echo \"external command output\"; exit 125");
  }
}
