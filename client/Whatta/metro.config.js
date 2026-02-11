// metro.config.js (Expo)
const { getDefaultConfig } = require('expo/metro-config')

module.exports = (() => {
  const config = getDefaultConfig(__dirname)

  config.transformer = {
    ...config.transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  }

  const { resolver } = config
  resolver.assetExts = resolver.assetExts.filter((ext) => ext !== 'svg')
  resolver.sourceExts = [...resolver.sourceExts, 'svg']

  return config
})()
