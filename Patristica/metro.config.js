const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

config.resolver.assetExts.push('db')

// Exclude online JSON files served from GitHub CDN — never imported in JS.
// Uses explicit subpaths to avoid accidentally blocking src/data/ source files.
config.resolver.blockList = [
  /\/data\/online\//,
  /\/data\/words\//,
  // build inputs (MACULA, Missale Meum clones, packs) — hundreds of MB, never bundled
  /[/\\]temp[/\\]/,
]

module.exports = config
