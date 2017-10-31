
class AgentTestCase extends ImpTestCase {
  function testAgentServerError() {
      AgentServerError().checkThrowException();
      assertTrue(true, "This check should never happen because of runtime error on the previous step.");
  }
}
