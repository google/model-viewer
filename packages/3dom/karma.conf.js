/* @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

module.exports = function(config) {
  // @see http://karma-runner.github.io/4.0/config/configuration-file.html
  config.set({
    basePath: '',
    plugins: [
      require.resolve('@open-wc/karma-esm'),
      'karma-*',
    ],
    frameworks: ['esm', 'mocha', 'chai'],
    files: [
      {pattern: 'node_modules/@ungap/event-target/min.js', watched: false},
      {pattern: 'shared-assets/models/Astronaut.glb', included: false},
      {pattern: 'lib/**/*-spec.js', watched: true, type: 'module'},
    ],
    autoWatchBatchDelay: 1000,
    restartOnFileChange: true,

    browserDisconnectTimeout: 300000,
    browserNoActivityTimeout: 360000,
    captureTimeout: 420000,
    concurrency: 10,

    // @see https://github.com/open-wc/open-wc/tree/master/packages/karma-esm#configuration
    esm: {
      nodeResolve: true,
      compatibility: 'auto',
      preserveSymlinks: true,
    },

    client: {
      mocha: {
        reporter: 'html',
        ui: 'tdd',
        timeout: 10000,
      },
    },

    reporters: ['mocha'],

    mochaReporter: {output: 'autowatch'},

    // Note setting --browsers on the command-line always overrides this list.
    browsers: [
      'ChromeHeadless',
    ],
  });

  if (process.env.USE_BROWSER_STACK) {
    if (!process.env.BROWSER_STACK_USERNAME ||
        !process.env.BROWSER_STACK_ACCESS_KEY) {
      throw new Error(
          'BROWSER_STACK_USERNAME and BROWSER_STACK_ACCESS_KEY must be set with USE_BROWSER_STACK');
    }

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
      if (args[2] != null && args[2].url === 'http://bs-local.com:9876') {
        console.warn('PATCHING URL TO ADD ID');
        const config = args[0];
        const browser = args[2];
        const query = config.url.split('?')[1];
        browser.url = `${browser.url}?${query}`;
      }
      return assign.apply(this, args);
    };
    // Something in Karma deps actually asserts the sub-keys of Object.assign,
    // so make sure to copy those over too:
    assign.call(Object, newAssign, assign);
    Object.assign = newAssign;

    const browserStackLaunchers = {
      'Edge (latest)': {
        base: 'BrowserStack',
        os: 'Windows',
        os_version: '10',
        browser: 'Edge',
        browser_version: 'latest',
      },
      'Edge 79.0': {
        base: 'BrowserStack',
        os: 'Windows',
        os_version: '10',
        browser: 'Edge',
        browser_version: '80.0',
      },
      'Firefox (latest)': {
        base: 'BrowserStack',
        os: 'Windows',
        os_version: '10',
        browser: 'Firefox',
        browser_version: 'latest',
      },
      'Firefox 72.0': {
        base: 'BrowserStack',
        os: 'Windows',
        os_version: '10',
        browser: 'Firefox',
        browser_version: '72.0',
      },
      'Safari (latest)': {
        base: 'BrowserStack',
        os: 'OS X',
        os_version: 'Catalina',
        browser: 'safari',
        browser_version: 'latest',
      },
      'Safari 12.1': {
        base: 'BrowserStack',
        os: 'OS X',
        os_version: 'Mojave',
        browser: 'safari',
        browser_version: '12.1',
      },
      'iOS Safari (iOS 13)': {
        base: 'BrowserStack',
        os: 'iOS',
        os_version: '12',
        device: 'iPhone 8',
        browser: 'iPhone',
        real_mobile: 'true',
        // BrowserStack seems to drop the port when redirecting to this special
        // domain so we go there directly instead:
        url: 'http://bs-local.com:9876'
      },
      'iOS Safari (iOS 12)': {
        base: 'BrowserStack',
        os: 'iOS',
        os_version: '12',
        device: 'iPhone 7',
        browser: 'iPhone',
        real_mobile: 'true',
        // BrowserStack seems to drop the port when redirecting to this special
        // domain so we go there directly instead:
        url: 'http://bs-local.com:9876'
      },
    };

    config.set({
      browserStack: {
        idleTimeout: 600,
        name: '3DOM Unit Tests',
        project: '3DOM',
        build: process.env.BROWSER_STACK_BUILD_NAME || `${Date.now()}`,
      },

      reporters: ['BrowserStack', 'mocha'],

      customLaunchers: browserStackLaunchers,
      browsers: [...config.browsers, ...Object.keys(browserStackLaunchers)],
    });
  }
};