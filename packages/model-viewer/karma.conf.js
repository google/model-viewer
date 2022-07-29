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
  });


  if (process.env.USE_BROWSER_STACK) {
    if (!process.env.BROWSER_STACK_USERNAME ||
        !process.env.BROWSER_STACK_ACCESS_KEY) {
      throw new Error(
          'BROWSER_STACK_USERNAME and BROWSER_STACK_ACCESS_KEY must be set with USE_BROWSER_STACK');
    }

    const browserStackLaunchers = {
      'Chrome': {
        base: 'BrowserStack',
        os: 'Windows',
        os_version: '10',
        browser: 'Chrome',
        browser_version: 'latest',
        browserstack: {localIdentifier: 'chrome'},
        myID: 0
      },
      'ChromeLast': {
        base: 'BrowserStack',
        os: 'Windows',
        os_version: '10',
        browser: 'Chrome',
        browser_version: 'latest-1',
        browserstack: {localIdentifier: 'chromeOld'},
        myID: 1
      },
      'Edge': {
        base: 'BrowserStack',
        os: 'Windows',
        os_version: '10',
        browser: 'Edge',
        browser_version: 'latest',
        browserstack: {localIdentifier: 'edge'},
        myID: 2
      },
      'EdgeLast': {
        base: 'BrowserStack',
        os: 'Windows',
        os_version: '10',
        browser: 'Edge',
        browser_version: 'latest-1',
        browserstack: {localIdentifier: 'edgeOld'},
        myID: 3
      },
      'Firefox': {
        base: 'BrowserStack',
        os: 'Windows',
        os_version: '10',
        browser: 'Firefox',
        browser_version: 'latest',
        browserstack: {localIdentifier: 'Firefox'},
        myID: 4
      },
      'FirefoxLast': {
        base: 'BrowserStack',
        os: 'Windows',
        os_version: '10',
        browser: 'Firefox',
        browser_version: 'latest-1',
        browserstack: {localIdentifier: 'FirefoxOld'},
        myID: 5
      },
      'Safari': {
        base: 'BrowserStack',
        os: 'OS X',
        os_version: 'Catalina',
        browser: 'safari',
        browser_version: 'latest',
        browserstack: {localIdentifier: 'Safari'},
        myID: 6
      },
      'iOS14': {
        base: 'BrowserStack',
        os: 'iOS',
        os_version: '14',
        device: 'iPhone 11',
        browser: 'iPhone',
        real_mobile: 'true',
        browserstack: {localIdentifier: 'iOS14'},
        myID: 7
      },
      'iOS15': {
        base: 'BrowserStack',
        os: 'iOS',
        os_version: '15',
        device: 'iPhone 13',
        browser: 'iPhone',
        real_mobile: 'true',
        browserstack: {localIdentifier: 'iOS15'},
        myID: 8
      },
      'Android': {
        base: 'BrowserStack',
        os: 'Android',
        os_version: '10.0',
        device: 'Samsung Galaxy A11',
        browser: 'Android',
        real_mobile: 'true',
        browserstack: {localIdentifier: 'AndroidP30'},
        myID: 9
      },
    };

    const browserStackLauncher = {};
    browserStackLauncher[process.env.BROWSER] =
        browserStackLaunchers[process.env.BROWSER];

    config.set({
      browserStack: {
        idleTimeout: 600,
        name: '<model-viewer> Unit Tests',
        project: '<model-viewer>',
        build: process.env.BROWSER_STACK_BUILD_NAME
      },

      reporters: ['BrowserStack', 'mocha'],

      customLaunchers: browserStackLauncher,
      browsers: [process.env.BROWSER],
      port: browserStackLauncher[process.env.BROWSER].myID * 100 + 9076
    });
  } else {
    config.set({
      // Note setting --browsers on the command-line always overrides this list.
      browsers: [
        'ChromeHeadlessNoSandbox',
      ],

      customLaunchers: {
        ChromeHeadlessNoSandbox: {
          base: 'ChromeHeadless',
          flags: ['--no-sandbox'],
        }
      }
    });
  }
};