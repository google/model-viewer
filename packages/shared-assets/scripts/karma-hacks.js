module.exports.applyKarmaHacks = () => {
  const uniqueTunnelID = `${Date.now()}-${Math.random().toString().slice(2)}`;

  // This terrible hack needed in order to specify a custom BrowserStack
  // tunnel identifier. Failures to do so results in overlapping tunnels when
  // builds run in parallel.
  // @see https://github.com/karma-runner/karma-browserstack-launcher/issues/155

  // Patch global require so that we can intercept a resolved module by name. It
  // isn't sufficient to require the module ourselves because it is a transitive
  // dependency and we might not resolve the correct version:
  const Module = module.constructor;
  const require = Module.prototype.require;
  Module.prototype.require = function(...args) {
    const resolvedModule = require.apply(this, args);
    if (args[0] === 'browserstack-local') {
      const {Local} = resolvedModule;
      // Annoyingly, browserstack-local populates methods using assignment on
      // the instance rather than decorating the prototype, so we have to wrap
      // the constructor in order to patch anything:
      // @see https://github.com/browserstack/browserstack-local-nodejs/blob/d238484416e7ea6dfb51aede7d84d09339a8032a/lib/Local.js#L28
      const WrappedLocal = function(...args) {
        // Create an instance of the canonical class and patch its method post
        // hoc before it is handed off to the invoking user:
        const local = new Local(...args);
        const start = local.start;
        local.start = function(...args) {
          const config = args[0];
          // If the config is lacking a specified identifier for the tunnel,
          // make sure to populate it with the one we want:
          if (config && config.localIdentifier == null) {
            console.warn(
                'Patching BrowserStack tunnel configuration to specify unique ID:',
                uniqueTunnelID);
            config.localIdentifier = uniqueTunnelID;
          }
          return start.apply(this, args);
        };
        return local;
      };
      resolvedModule.Local = WrappedLocal;
    }
    return resolvedModule;
  };

  // This terrible hack brought to you by a combination of two things:
  //  1. BrowserStack drops the server port when redirecting from localhost
  //     to bs-local.com on iOS
  //  2. karma-browserstack-launcher drops the test-specific browser ID if
  //     you configure the browser with a custom URL
  // A support request to BrowserStack has been filed.
  // A related bug has been filed againts karma-browserstack-launcher
  // @see https://github.com/karma-runner/karma-browserstack-launcher/issues/172
  const assign = Object.assign;
  const newAssign = function(...args) {
    // If we know this to be one very specific Object.assign call, then grab
    // the test-specific browser ID and append it to our URL:
    // @see https://github.com/karma-runner/karma-browserstack-launcher/blob/76dbfd0db6db46f4f85012cfe3c1f4c3accd2e44/index.js#L143
    const url = args[2] && args[2].url;

    if (url != null &&
        (url === 'http://bs-local.com:9876' ||
         url === 'http://127.0.0.1:9876')) {
      const config = args[0];
      const browser = args[2];
      const query = config.url.split('?')[1];
      browser.url = `${browser.url}?${query}`;

      console.warn('Patching test URL to add Karma ID:', browser.url);
    }
    return assign.apply(this, args);
  };
  // Something in Karma deps actually asserts the sub-keys of Object.assign,
  // so make sure to copy those over too:
  assign.call(Object, newAssign, assign);
  Object.assign = newAssign;

  return uniqueTunnelID;
};