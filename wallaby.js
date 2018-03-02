module.exports = function (wallaby) {
  return {
    debug: true,
    files: [
      {pattern: 'node_modules/chai/chai.js', instrument: false},
      './src/**/[^_]*.js'
    ],
    tests: [
      './tests/**/*.spec.js'
    ],
    testFramework: 'mocha',
    setup: function () {
      window.expect = chai.expect
    },
    env: {
      kind: 'chrome'
    }
  }
}
