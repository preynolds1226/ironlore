const { withPodfile } = require('@expo/config-plugins');

/** Xcode 26 + fmt pod: disable consteval format strings (compile error in Archive). */
function withFmtConstevalFix(config) {
  return withPodfile(config, (config) => {
    const marker = 'FMT_USE_CONSTEVAL=0';
    const podfile = config.modResults;
    let contents =
      typeof podfile === 'string' ? podfile : podfile?.contents ?? String(podfile);

    if (!contents.includes(marker)) {
      contents = contents.replace(
        /post_install do \|installer\|/,
        `post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |build_config|
      build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
      build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << '${marker}'
    end
  end`,
      );
    }

    if (typeof podfile === 'string') {
      config.modResults = contents;
    } else {
      config.modResults = { ...podfile, contents };
    }
    return config;
  });
}

module.exports = withFmtConstevalFix;
