const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  mode: 'production',
  entry: {
    background: './src/background.js',
    popup: './src/popup.js',
    options: './src/options.js',
    dashboard: './src/dashboard.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader"],
      },
    ],
  },
  // Removed optimization.splitChunks to avoid chunk conflict.
  // We will output a separate CSS file for each entry point.
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[name].css", // Generate popup.css, dashboard.css, etc.
    }),
    new CopyPlugin({
      patterns: [
        { from: 'src/manifest.json', to: '.' },
        { from: 'src/popup.html', to: '.', noErrorOnMissing: true },
        { from: 'src/options.html', to: '.', noErrorOnMissing: true },
        { from: 'src/dashboard.html', to: '.', noErrorOnMissing: true },
        // Copy assets folder if it exists, or individual icons
        { from: 'src/assets', to: 'assets', noErrorOnMissing: true },
      ],
    }),
  ],
  devtool: false,
};
