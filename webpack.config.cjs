const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development', // Sets the environment to development mode
  entry: './src/index.js', // The entry point of your application
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'], // or MiniCssExtractPlugin.loader
      },
    ],
  },
  resolve: {
    fallback: {
      canvas: false
    }
  },
  output: {
    filename: 'bundle.js', // The name of the output file
    path: path.resolve(__dirname, 'dist'), // The folder where the bundle goes
    clean: true, // Cleans the dist folder before each build
  },
  devServer: {
    static: './dist',
    open: true, // Automatically opens the browser
    port: 3000, // Local server port
  },
  plugins: [
    new HtmlWebpackPlugin({
        template: './src/index.html', // Uses our custom HTML file as a template
    }),
  ],
};
