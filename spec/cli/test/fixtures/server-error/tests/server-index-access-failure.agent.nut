
class AgentTestCase extends ImpTestCase {
  function testAgentServerError() {
      AgentServerError().checkFieldDoesNotExist();
      assertTrue(false, "This assert should never happen because of runtime error on the previous step.");
  }
}
