module.exports = ({ config }) => {
  config.module.rules.push({
    test: /\.(ts|tsx)$/,
    loader: require.resolve('babel-loader'),
    options: {
      presets: [
        '@babel/preset-env',
        '@babel/preset-react',
        '@babel/preset-typescript'
      ],
      plugins: ['@babel/plugin-proposal-class-properties']
    }
  })
  // avoid possible ts errors we are not interested in
  for (const plugin of config.plugins) {
    if (plugin.constructor.name === 'ForkTsCheckerWebpackPlugin') {
      plugin.compilerOptions.skipLibCheck = true
    }
  }
  config.resolve.extensions.push('.ts', '.tsx')
  config.devServer = {
    stats: 'errors-only'
  }
  return config
}
