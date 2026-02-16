const rootConfig = require("../swissknife.config.js");
const appJson = require("./app.json");

module.exports = {
  ...appJson,
  extra: {
    debug: rootConfig.debug,
    apiBaseUrl: rootConfig.apiBaseUrl,
    privacyPolicyUrl: rootConfig.privacyPolicyUrl,
    supportUrl: rootConfig.supportUrl,
    supportEmail: rootConfig.supportEmail,
    revenueCat: rootConfig.revenueCat,
    billing: rootConfig.billing,
    supabaseUrl: rootConfig.supabaseUrl,
    supabaseAnonKey: rootConfig.supabaseAnonKey,
  },
};
