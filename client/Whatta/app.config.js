module.exports = ({ config }) => {
  const variant = process.env.APP_VARIANT ?? "prod";
  const isDev = variant === "dev";

  return {
    ...config,
    name: isDev ? "Whatta Dev" : "Whatta",
    ios: {
      ...config.ios,
      bundleIdentifier: isDev ? "com.whatta.whatta.dev" : "com.whatta.whatta",
    },
    android: {
      ...config.android,
      package: isDev ? "com.whatta.whatta.dev" : "com.whatta.whatta",
    },
    extra: { ...config.extra, variant },
  };
};