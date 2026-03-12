module.exports = ({ config }) => {
  const variant = process.env.APP_VARIANT ?? "prod";
  const profile = process.env.EAS_BUILD_PROFILE ?? "";

  const envByProfile = {
    development: "local",
    devTestFlight: "dev",
    preview: "prod",
    production: "prod",
  };

  const env =
    envByProfile[profile] ??
    (variant === "local" ? "local" : variant === "dev" ? "dev" : "prod");

  const envConfig = {
    prod: {
      appName: "Whatta",
      iosBundleIdentifier: "com.whatta.whatta",
      androidPackage: "com.whatta.whatta",
      iosGoogleServicesFile: "./GoogleService-Info.prod.plist",
      apiBaseUrl:
        "https://whatta-server-741565423469.asia-northeast3.run.app/api",
    },
    dev: {
      appName: "Whatta Dev",
      iosBundleIdentifier: "com.whatta.whatta.dev",
      androidPackage: "com.whatta.whatta.dev",
      iosGoogleServicesFile: "./GoogleService-Info.dev.plist",
      apiBaseUrl:
        "https://whatta-server-dev-741565423469.asia-northeast3.run.app/api",
    },
    local: {
      appName: "Whatta Local",
      iosBundleIdentifier: "com.whatta.whatta.local",
      androidPackage: "com.whatta.whatta.local",
      iosGoogleServicesFile: "./GoogleService-Info.local.plist",
      apiBaseUrl:
        "https://whatta-server-dev-741565423469.asia-northeast3.run.app/api",
    },
  };

  const selected = envConfig[env];

  return {
    ...config,
    name: selected.appName,
    ios: {
      ...config.ios,
      bundleIdentifier: selected.iosBundleIdentifier,
      googleServicesFile: selected.iosGoogleServicesFile,
    },
    android: {
      ...config.android,
      package: selected.androidPackage,
    },
    extra: {
      ...config.extra,
      variant,
      profile,
      env,
      apiBaseUrl: selected.apiBaseUrl,
    },
  };
};
