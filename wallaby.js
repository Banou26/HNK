module.exports = function (wallaby) {
  return {
    debug: true,
    files: [
      {pattern: 'node_modules/chai/chai.js', instrument: false},
      {pattern: 'node_modules/chai-dom/chai-dom.js', instrument: false},
      './src/**/[^_]*.js'
    ],
    tests: [
      './tests/**/*.spec.js'
    ],
    testFramework: 'jasmine',
    setup: function () {
      window.expect = chai.expect
    },
    env: {
      kind: 'chrome'
    }
  }
}
