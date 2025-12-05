const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: path.resolve(__dirname, 'src/main.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/dist/',
    clean: true
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: '**/*.vue', to: 'src/[path][name][ext]', context: path.resolve(__dirname, 'src'), noErrorOnMissing: true }
      ]
    })
  ],
  devServer: {
    static: {
      directory: __dirname
    },
    host: '0.0.0.0',
    port: 8080,
    hot: false,
    client: {
      logging: 'info'
    }
  },
  experiments: {
    topLevelAwait: true
  },
  devtool: 'source-map'
};
