const nodeExternals = require('webpack-node-externals');

module.exports = {
  mode: "production",
  externals: [nodeExternals()],
};
