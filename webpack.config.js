const path = require('path')
const GasPlugin = require('gas-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')

const config = {
  mode: 'production',
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: ['ts-loader'],
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    // Empty dist/ before each build (replaces clean-webpack-plugin).
    clean: true
  },
  plugins: [
    new GasPlugin(),
    new CopyPlugin({
      patterns: [
        {
          from: 'src/**/*.html',
          to: '[name][ext]',
          noErrorOnMissing: true
        }
      ]
    })
  ]
}

module.exports = config
