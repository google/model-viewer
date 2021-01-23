module.exports.applyKarmaHacks = () => {
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
};