/**
 * @license
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
 *
 */

const {applyKarmaHacks} = require('./karma-hacks.js');

const browserStackTunnelID = applyKarmaHacks();

/**
 * Karma configuration
 * @param {!Object} config config object from Karma
 */
module.exports = function(config) {
  config.set({
    basePath: '',
    plugins: [
      require.resolve('@open-wc/karma-esm'),
      'karma-*',
    ],
    frameworks: ['esm', 'jasmine'],
    files: [
      './define_process_env.js',
      {pattern: 'lib/**/*_test.js', watched: true, type: 'module'},
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

    const browserStackLaunchers = {
      // TODO(#1207)
      // 'Edge (latest)': {
      //   base: 'BrowserStack',
      //   os: 'Windows',
      //   os_version: '10',
      //   browser: 'Edge',
      //   browser_version: 'latest',
      // },
      'Chrome 83.0': {
        base: 'BrowserStack',
        os: 'Windows',
        os_version: '10',
        browser: 'Chrome',
        browser_version: '83.0',
      },
      'Edge 83.0': {
        base: 'BrowserStack',
        os: 'Windows',
        os_version: '10',
        browser: 'Edge',
        browser_version: '83.0',
      },
      'Firefox (latest)': {
        base: 'BrowserStack',
        os: 'Windows',
        os_version: '10',
        browser: 'Firefox',
        browser_version: 'latest',
      },
      // TODO(#1207)
      // 'Firefox 76.0': {
      //   base: 'BrowserStack',
      //   os: 'Windows',
      //   os_version: '10',
      //   browser: 'Firefox',
      //   browser_version: '76.0',
      // },
      'Safari (latest)': {
        base: 'BrowserStack',
        os: 'OS X',
        os_version: 'Catalina',
        browser: 'safari',
        browser_version: 'latest',
        // BrowserStack occasionally fails to tunnel localhost for Safari
        // instances, causing them to time out:
        url: 'http://127.0.0.1:9876'
      },
      'Safari 12.1': {
        base: 'BrowserStack',
        os: 'OS X',
        os_version: 'Mojave',
        browser: 'safari',
        browser_version: '12.1',
        // BrowserStack occasionally fails to tunnel localhost for Safari
        // instances, causing them to time out:
        url: 'http://127.0.0.1:9876'
      },
      'iOS Safari (iOS 13)': {
        base: 'BrowserStack',
        os: 'iOS',
        os_version: '13',
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
        name: 'Editing Adapter Unit Tests',
        project: 'model-viewer editing-adapter',
        build: process.env.BROWSER_STACK_BUILD_NAME || browserStackTunnelID,
        tunnelIdentifier: browserStackTunnelID
      },

      reporters: ['BrowserStack'],

      customLaunchers: browserStackLaunchers,
      browsers: [...config.browsers, ...Object.keys(browserStackLaunchers)],
  });
  }
};
