'use strict';

const CodeProcessor = require('../src/lib/CodeProcessor');

describe('CodeProcessor test suite', () => {

  let c;

  beforeEach(() => {
    c = new CodeProcessor();
  });

  it('shopuld replace vars', () => {
    process.env.__TEST_ENV_VAR__ = 123;
    c.variables.__FILE__ = 'SomeFile';

    const source = 'local abc = #{env:__TEST_ENV_VAR__}; // #{__LINE__},#{__LINE__}\n' +
               'local def = #{__LINE__}\n' +
               'local ghi = "#{__FILE__}"';

    const result = c.process(source);

    expect(result).toBe('local abc = 123; // 1,1\n' +
                        'local def = 2\n' +
                        'local ghi = "SomeFile"');
  });

  it('should throw error on undefined var', () => {
    expect(() => {
      const sourcce = '#{UNDEFINED_VAR}';
      c.process(sourcce);
    }).toThrow();
  });

  it('should throw error on blocked var', () => {
    expect(() => {
      process.env.__BLOCKED_VAR__ = 123;
      c.blockedEnvVars = ['__BLOCKED_VAR__'];
      const source = '#{env:__BLOCKED_VAR__}';
      c.process(source);
    }).toThrow();
  });

});
