'use strict';

const Watchdog = require('../src/lib/Watchdog');

describe('Watchdog test suite', () => {

  let w;

  beforeEach(() => {
    w = new Watchdog();
  });

  it('should emit timeout event in specified time', (done) => {

    let tId;

    w.timeout = 0.5;
    w.start();

    // this should be cancelled in 0.5s
    tId = setTimeout(() => {
      done.fail();
    }, 555);

    w.on('timeout', () => {
      clearTimeout(tId);
      done();
    });

  });

  it('should stop watchdog timer', (done) => {

    w.timeout = 0.5;
    w.start();

    // this should cancel watchdog
    setTimeout(() => {
      w.stop();
    }, 444);

    w.on('timeout', () => {
      done.fail();
    });

    // done
    setTimeout(done, 555);
  });

  it('should restart watchdog timer', (done) => {

    const start = new Date();

    w.timeout = 0.5;
    w.start();

    setTimeout(() => {
      w.reset();
    }, 250);

    w.on('timeout', () => {
      const passed = (new Date()) - start;

      if (passed < 700) {
        done.fail('Timer has not been restarted');
      } else {
        done();
      }
    });

  });
});
