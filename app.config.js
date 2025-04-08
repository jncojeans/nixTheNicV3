const { ExpoConfig, ConfigContext } = require('@expo/config');
const withYogaFix = require('./plugins/withYogaFix');
const withHermesFix = require('./plugins/withHermesFix');

// Export a function that returns the configuration
module.exports = function(config) {
  // Apply fixes in sequence
  let modifiedConfig = withYogaFix(config.config);
  modifiedConfig = withHermesFix(modifiedConfig);
  
  return modifiedConfig;
}; 