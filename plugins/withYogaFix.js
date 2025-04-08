const { withDangerousMod } = require('@expo/config-plugins');
const { ExpoConfig } = require('@expo/config-types');
const fs = require('fs');
const path = require('path');

/**
 * This plugin adds a post-install script to fix the Yoga incompatible function pointer types error
 * that occurs with React Native 0.76.x and Expo SDK 52
 */
const withYogaFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      // Check if the Podfile exists
      if (!fs.existsSync(podfilePath)) {
        console.log('Podfile not found. Skipping Yoga fix.');
        return config;
      }
      
      // Read the Podfile content
      let podfileContent = fs.readFileSync(podfilePath, 'utf8');
      
      // Create a properly formatted post_install hook for Yoga fix
      const postInstallHook = `
  post_install do |installer|
    # Yoga fix for incompatible function pointer types
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        if target.name == 'Yoga'
          config.build_settings['OTHER_CFLAGS'] = "$(inherited) -Wno-error=incompatible-function-pointer-types -Wno-incompatible-function-pointer-types"
          config.build_settings['GCC_WARN_INHIBIT_ALL_WARNINGS'] = 'YES'
        end
        # Additional general settings that help with builds
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
        config.build_settings['SWIFT_VERSION'] = '5.0'
        config.build_settings['EXCLUDED_ARCHS[sdk=iphonesimulator*]'] = 'arm64'
      end
    end
  end`;
      
      // Pattern for the entire post_install block, including all nested ends
      const postInstallPattern = /post_install\s+do\s+\|installer\|([\s\S]*?)^end/m;
      
      // If there's a post_install hook already, replace it entirely
      if (podfileContent.match(postInstallPattern)) {
        podfileContent = podfileContent.replace(postInstallPattern, postInstallHook);
      } else {
        // Otherwise, add it before the final end
        const lastEndIndex = podfileContent.lastIndexOf('end');
        if (lastEndIndex !== -1) {
          podfileContent = 
            podfileContent.substring(0, lastEndIndex) + 
            postInstallHook + '\n' + 
            podfileContent.substring(lastEndIndex);
        } else {
          // If no end is found, just append
          podfileContent += postInstallHook;
        }
      }
      
      // Write the updated Podfile
      fs.writeFileSync(podfilePath, podfileContent);
      console.log('✅ Added Yoga fix to Podfile');
      
      return config;
    },
  ]);
};

module.exports = withYogaFix; 