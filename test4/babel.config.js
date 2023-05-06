module.exports = function(api) {
  api.cache(true)
  return {
    presets: ['@babel/preset-typescript', [
      '@babel/preset-env',
      {
        'targets': {
          'edge': '17',
          'firefox': '60',
          'chrome': '67',
          'safari': '11.1',
          'node': '14'
        },
        'useBuiltIns': 'entry',
        'corejs': 3
      }
    ]],
    plugins: ['@babel/plugin-transform-modules-commonjs', '@babel/plugin-transform-typescript'],
    babelrcRoots: ['.', 'node_modules']
  }
}
