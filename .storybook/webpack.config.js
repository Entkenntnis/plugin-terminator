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
      plugins: [  
        '@babel/plugin-proposal-class-properties'
      ]
    }
  })
  config.resolve.extensions.push('.ts', '.tsx')
  config.devServer = {
    stats: 'errors-only'
  }
  return config
}
