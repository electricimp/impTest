class TestCase extends ImpTestCase {
  function testExtCommand() {
    this.runCommand("echo \"external command output\"; sleep 1000; exit 0");
  }
}
