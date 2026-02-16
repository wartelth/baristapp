const rootConfig = require("../swissknife.config.js");
const appJson = require("./app.json");

module.exports = {
  ...appJson,
  extra: {
    debug: rootConfig.debug,
    apiBaseUrl: rootConfig.apiBaseUrl,
    supabaseUrl: rootConfig.supabaseUrl,
    supabaseAnonKey: rootConfig.supabaseAnonKey,
  },
};
