const path = require('path')
module.exports = {
  entry: process.env.entry,
  output: {
    path: path.resolve(__dirname, './build'),
    publicPath: '/',
    filename: process.env.outputFilename
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'eslint-loader'
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.(eot|ttf|woff|woff2|png|jpg|gif|svg)$/,
        loader: 'file-loader'
      }
    ]
  }
}
