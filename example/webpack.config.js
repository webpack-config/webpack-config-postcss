/* eslint-disable no-var */
/* eslint-disable import/no-require */

var postcss = require('../').default;
var path = require('path');

module.exports = postcss()({
  entry: './index.js',
  context: __dirname,
  output: {
    path: path.join(__dirname, 'dist'),
    publicPath: '/foo',
    filename: 'bundle.js',
  },
  target: process.env.WEBPACK_TARGET,
  resolveLoader: {
    extensions: ['.js'],
  },
});
