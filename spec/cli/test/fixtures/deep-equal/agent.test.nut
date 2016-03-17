
class TestCase1 extends ImpTestCase {
  function test1() {
    this.assertDeepEqual(
      /* expected */
      {
        "a" : 1,
        "b" : {
          "c" : 3
        }
      },
      /* actual */
      {
        "a" : 1,
        "b" : {
//          "c" : 3
        }
      }
    );
  }

  function test2() {
    this.assertDeepEqual(
      /* expected */
      {
        "a" : 1,
        "b" : {
          "c" : 3
        }
      },
      /* actual */
      {
        "a" : 1,
        "b" : {
          "c" : 3,
          "d" : 4
        }
      }
    );
  }

  function test3() {
    this.assertDeepEqual(
      /* expected */
      {
        "a" : 1,
        "b" : {
          "c" : 3
        }
      },
      /* actual */
      {
        "a" : 1,
        "b" : {
          "c" : 100
        }
      }
    );
  }
}
