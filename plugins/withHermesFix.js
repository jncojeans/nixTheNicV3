const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * This plugin adds fixes for Hermes-related build issues
 */
const withHermesFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      // Check if the Podfile exists
      if (!fs.existsSync(podfilePath)) {
        console.log('Podfile not found. Skipping Hermes fix.');
        return config;
      }
      
      // Read the Podfile content
      let podfileContent = fs.readFileSync(podfilePath, 'utf8');
      
      // Add a pre_install hook for Hermes fixes
      const preInstallHook = `
pre_install do |installer|
  # Fix Hermes deployment issue
  installer.pod_targets.each do |pod|
    if pod.name.eql?('hermes-engine')
      def pod.build_type
        Pod::BuildType.static_library
      end
    end
  end
end`;
      
      // If podfileContent doesn't already have pre_install hook, add it after the platform line
      if (!podfileContent.includes('pre_install do |installer|')) {
        const platformLineIndex = podfileContent.indexOf("platform :ios");
        if (platformLineIndex !== -1) {
          // Find the end of that line
          const endOfPlatformLine = podfileContent.indexOf("\n", platformLineIndex) + 1;
          
          podfileContent = 
            podfileContent.substring(0, endOfPlatformLine) + 
            preInstallHook + "\n\n" +
            podfileContent.substring(endOfPlatformLine);
        }
      }
      
      // Add Hermes-related fixes to post_install
      let postInstallContent = `
    # Hermes fixes
    installer.pods_project.targets.each do |target|
      if target.name.start_with?("hermes-engine")
        target.build_configurations.each do |config|
          # Force static builds for Hermes
          config.build_settings['SUPPORTED_PLATFORMS'] = 'iphoneos iphonesimulator'
          config.build_settings['SWIFT_VERSION'] = '5.0'
          config.build_settings['ONLY_ACTIVE_ARCH'] = 'NO'
          
          # Fix Build library for distribution error
          config.build_settings['BUILD_LIBRARY_FOR_DISTRIBUTION'] = 'YES'
        end
      end
    end`;
      
      // Find the post_install hook
      const postInstallIndex = podfileContent.indexOf("post_install do |installer|");
      if (postInstallIndex !== -1) {
        // Find the first 'end' after post_install
        const endIndex = podfileContent.indexOf("  end", postInstallIndex);
        if (endIndex !== -1) {
          // Insert our Hermes fixes before the first end
          podfileContent = 
            podfileContent.substring(0, endIndex) + 
            postInstallContent +
            podfileContent.substring(endIndex);
        }
      }
      
      // Add a fix to ensure Hermes is properly configured in the React-Core subspec
      // Find the location where React-Core is configured
      const reactCoreIndex = podfileContent.indexOf("use_react_native!");
      if (reactCoreIndex !== -1) {
        // Modify React-Native configuration to explicitly set hermes_enabled
        const reactNativeConfig = podfileContent.substring(reactCoreIndex, podfileContent.indexOf(")", reactCoreIndex) + 1);
        const updatedConfig = reactNativeConfig.replace(
          /hermes_enabled => (.*)/,
          'hermes_enabled => true,'
        );
        
        podfileContent = podfileContent.replace(reactNativeConfig, updatedConfig);
      }
      
      // Write the updated Podfile
      fs.writeFileSync(podfilePath, podfileContent);
      console.log('✅ Added Hermes fixes to Podfile');
      
      return config;
    },
  ]);
};

module.exports = withHermesFix; 