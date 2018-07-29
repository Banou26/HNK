process.env.CHROME_BIN = require('puppeteer').executablePath()

const webpackConfig = {
  mode: 'development',
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
    frameworks: ['chai', 'jasmine'],
    files: [
      'tests/index.js'
    ],
    preprocessors: {
      'tests/index.js': ['webpack', 'sourcemap']
    },
    webpack: webpackConfig,
    webpackMiddleware: {
      noInfo: true
    },
    reporters: ['mocha'],
    plugins: [
      'karma-chrome-launcher',
      'karma-jasmine',
      'karma-mocha-reporter',
      'karma-sourcemap-loader',
      'karma-webpack',
      'karma-chai'
    ]
  })
}
