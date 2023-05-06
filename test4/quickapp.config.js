const path = require('path');

module.exports = {
  cli: {
    devtool: 'none'
  },
  webpack: {
    mode: 'production', // 'development'（开发模式），'production'（生产模式）
    target: ['web', 'es5'],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                cwd: __dirname
              }
            }
          ]
        }
      ]
    }
  }
};
