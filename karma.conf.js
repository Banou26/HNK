process.env.CHROME_BIN = require('puppeteer').executablePath()

var webpackConfig = {
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          plugins: [require('babel-plugin-transform-object-rest-spread')]
        }
      }
    ]
  }
}

module.exports = function (config) {
  config.set({
    browsers: ['ChromeHeadless'],
    colors: true,
    frameworks: ['mocha', 'chai'],
    files: [
      'tests/*.spec.js',
      'tests/**/*.spec.js'
    ],
    exclude: [],
    autoWatch: true,
    singleRun: false,
    reporters: ['mocha'],
    port: 9876,
    logLevel: config.LOG_DEBUG,
    webpack: webpackConfig,
    webpackMiddleware: {
      noInfo: true,
      stats: 'errors-only'
    },
    preprocessors: {
      'tests/*.spec.js': ['webpack'],
      'tests/**/*.spec.js': ['webpack']
    },
    plugins: [
      'karma-webpack',
      'karma-mocha',
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-chai',
      'karma-mocha-reporter'
    ]
  })
}
