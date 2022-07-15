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
      {
        pattern: 'node_modules/focus-visible/dist/focus-visible.js',
        watched: false
      },
      {pattern: 'node_modules/@ungap/event-target/min.js', watched: false},
      {pattern: 'shared-assets/**/*', included: false},
      {
        pattern: 'lib/test/**/*-spec.js',
        included: false,
        watched: true,
        type: 'module'
      },
      {pattern: 'lib/test/index.js', watched: true, type: 'module'}
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
        timeout: 60000,
      },
    },

    reporters: ['mocha'],

    mochaReporter: {output: 'autowatch'},

    // Note setting --browsers on the command-line always overrides this list.
    browsers: [
      'ChromeHeadlessNoSandbox',
    ],

    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox'],
      }
    },
  });


  if (process.env.USE_BROWSER_STACK) {
    if (!process.env.BROWSER_STACK_USERNAME ||
        !process.env.BROWSER_STACK_ACCESS_KEY) {
      throw new Error(
          'BROWSER_STACK_USERNAME and BROWSER_STACK_ACCESS_KEY must be set with USE_BROWSER_STACK');
    }

    const browserStackLaunchers = {
      'Chrome (latest)': {
        base: 'BrowserStack',
        os: 'Windows',
        os_version: '10',
        browser: 'Chrome',
        browser_version: 'latest',
        browserstack: {localIdentifier: 'chrome'}
      },
      'Chrome (latest-1)': {
        base: 'BrowserStack',
        os: 'Windows',
        os_version: '10',
        browser: 'Chrome',
        browser_version: 'latest-1',
        browserstack: {localIdentifier: 'chromeOld'}
      },
      'Edge (latest)': {
        base: 'BrowserStack',
        os: 'Windows',
        os_version: '10',
        browser: 'Edge',
        browser_version: 'latest',
        browserstack: {localIdentifier: 'edge'}
      },
      'Edge (latest-1)': {
        base: 'BrowserStack',
        os: 'Windows',
        os_version: '10',
        browser: 'Edge',
        browser_version: 'latest-1',
        browserstack: {localIdentifier: 'edgeOld'}
      },
      'Firefox (latest)': {
        base: 'BrowserStack',
        os: 'Windows',
        os_version: '10',
        browser: 'Firefox',
        browser_version: 'latest',
        browserstack: {localIdentifier: 'Firefox'}
      },
      'Firefox (latest-1)': {
        base: 'BrowserStack',
        os: 'Windows',
        os_version: '10',
        browser: 'Firefox',
        browser_version: 'latest-1',
        browserstack: {localIdentifier: 'FirefoxOld'}
      },
      'Safari (latest)': {
        base: 'BrowserStack',
        os: 'OS X',
        os_version: 'Catalina',
        browser: 'safari',
        browser_version: 'latest',
        browserstack: {localIdentifier: 'Safari'}
      },
      'iOS Safari (iOS 14)': {
        base: 'BrowserStack',
        os: 'iOS',
        os_version: '14',
        device: 'iPhone 11',
        browser: 'iPhone',
        real_mobile: 'true',
        browserstack: {localIdentifier: 'iOS14'}
      },
      'iOS Safari (iOS 15)': {
        base: 'BrowserStack',
        os: 'iOS',
        os_version: '15',
        device: 'iPhone 13',
        browser: 'iPhone',
        real_mobile: 'true',
        browserstack: {localIdentifier: 'iOS15'}
      },
      'Android 10 (Samsung)': {
        base: 'BrowserStack',
        os: 'Android',
        os_version: '10.0',
        device: 'Samsung Galaxy A11',
        browser: 'Android',
        real_mobile: 'true',
        browserstack: {localIdentifier: 'AndroidP30'}
      },
    };

    config.set({
      browserStack: {
        idleTimeout: 600,
        name: '<model-viewer> Unit Tests',
        project: '<model-viewer>',
        build: process.env.BROWSER_STACK_BUILD_NAME
      },

      reporters: ['BrowserStack', 'mocha'],

      customLaunchers: browserStackLaunchers,
      browsers: [...config.browsers, ...Object.keys(browserStackLaunchers)],
      concurrency: 3,
    });
  }
};