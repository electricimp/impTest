<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Assertions](#assertions)
  - [assertTrue()](#asserttrue)
  - [assertEqual()](#assertequal)
  - [assertGreater()](#assertgreater)
  - [assertLess()](#assertless)
  - [assertClose()](#assertclose)
  - [assertDeepEqual()](#assertdeepequal)
  - [assertBetween()](#assertbetween)
  - [assertThrowsError](#assertthrowserror)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


# Assertions

The following assertions are available in test cases.

## assertTrue()

`this.assertTrue(condition, [message])`

Asserts that the condition is truthful.

example:

```squirrel
 // ok
this.assertTrue(1 == 1);

// fails
this.assertTrue(1 == 2);
```

## assertEqual()

`this.assertEqual(expected, actual, [message])`

Asserts that two values are equal

example:

```squirrel
// ok
this.assertEqual(1000 * 0.01, 100 * 0.1);

// Failure: Expected value: 1, got: 2
this.assertEqual(1, 2);
```

## assertGreater()

`this.assertGreater(actual, cmp, [message])`

Asserts that value is greater than some other value.

example:

```squirrel
// ok
this.assertGreater(1, 0);

// Failure: Failed to assert that 1 > 2
this.assertGreater(1, 2);
```

## assertLess()

`this.assertLess(actual, cmp, [message])`

Asserts that value is less than some other value.

example:

```squirrel
// ok
this.assertLess(0, 1);

// Failure: Failed to assert that 2 < 2
this.assertLess(2, 2);
```

## assertClose()

`this.assertClose(expected, actual, maxDiff, [message])`

Asserts that value is within some tolerance from expected value.

example:

```squirrel
// ok
this.assertClose(10, 9, 2);

// Failure: Expected value: 10±0.5, got: 9
this.assertClose(10, 9, 0.5);
```

## assertDeepEqual()

`this.assertDeepEqual(expected, actual, [message])`

Performs a deep comparison of tables, arrays and classes.

example:

```squirrel
// ok
this.assertDeepEqual({"a" : { "b" : 1 }}, {"a" : { "b" : 0 }});

// Failure: Missing slot [a.b] in actual value
this.assertDeepEqual({"a" : { "b" : 1 }}, {"a" : { "_b" : 0 }});

// Failure: At [a.b]: expected "1", got "0"
this.assertDeepEqual({"a" : { "b" : 1 }}, {"a" : { "b" : 0 }});
```

## assertBetween()

`this.assertBetween(actual, from, to, [message])`

Asserts that a value belongs to the range from _from_ to _to_.

example:

```squirrel
// ok
this.assertBetween(10, 9, 11);

// Failure: Expected value the range of 11..12, got 10
this.assertBetween(10, 11, 12);
```

## assertThrowsError

`this.assertThrowsError(func, ctx, [args = []], [message])`

Asserts that function _func_ throws an error when called with arguments _args_ and context _ctx_. Returns error thrown by _func_.

```squirrel
// ok, returns "abc"
this.assertThrowsError(function (a) {
  throw a;
}, this, ["abc"]);

// Failure: Function was expected to throw an error
this.assertThrowsError(function () {
  // throw "error";
}, this);
```
