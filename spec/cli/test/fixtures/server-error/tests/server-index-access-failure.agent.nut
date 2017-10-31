
class AgentTestCase extends ImpTestCase {
  function testAgentServerError() {
      AgentServerError().checkFieldDoesNotExist();
      assertTrue(true, "This check should never happen because of runtime error on the previous step.");
  }
}
