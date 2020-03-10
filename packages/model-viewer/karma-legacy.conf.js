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
    // Use special port so that tests can run in parallel
    // Note that BrowserStack only allows a limited set of ports
    // @see https://www.browserstack.com/question/664
    port: 9877,
    plugins: [
      'karma-*',
    ],
    frameworks: ['mocha', 'chai'],
    files: [
      {
        pattern:
            'node_modules/@webcomponents/webcomponentsjs/webcomponents-loader.js',
        watched: false
      },
      {
        pattern: 'node_modules/@webcomponents/webcomponentsjs/bundles/*.js',
        watched: false,
        included: false
      },
      {
        pattern: 'node_modules/intersection-observer/intersection-observer.js',
        watched: false
      },
      {
        pattern: 'node_modules/resize-observer-polyfill/dist/ResizeObserver.js',
        watched: false
      },
      {
        pattern: 'node_modules/focus-visible/dist/focus-visible.js',
        watched: false
      },
      {pattern: 'node_modules/@ungap/event-target/min.js', watched: false},
      {pattern: 'shared-assets/**/*', included: false},
      {pattern: 'dist/unit-tests-legacy.js', watched: true},
    ],
    autoWatchBatchDelay: 1000,
    restartOnFileChange: true,

    browserDisconnectTimeout: 300000,
    browserNoActivityTimeout: 360000,
    captureTimeout: 420000,
    concurrency: 10,

    client: {
      mocha: {
        reporter: 'html',
        ui: 'tdd',
        timeout: 30000,
      },
    },

    reporters: ['mocha'],

    mochaReporter: {output: 'autowatch'},

    // Note setting --browsers on the command-line always overrides this list.
    browsers: [],
  });

  if (process.env.USE_BROWSER_STACK) {
    if (!process.env.BROWSER_STACK_USERNAME ||
        !process.env.BROWSER_STACK_ACCESS_KEY) {
      throw new Error(
          'BROWSER_STACK_USERNAME and BROWSER_STACK_ACCESS_KEY must be set with USE_BROWSER_STACK');
    }

    const browserStackLaunchers = {
      'IE11': {
        base: 'BrowserStack',
        browser: 'IE',
        browser_version: '11.0',
        os: 'Windows',
        os_version: '10'
      }
    };

    config.set({
      browserStack: {
        idleTimeout: 600,
        name: '<model-viewer> Unit Tests',
      },

      reporters: ['BrowserStack', 'mocha'],

      customLaunchers: browserStackLaunchers,
      browsers: [...config.browsers, ...Object.keys(browserStackLaunchers)],
    });
  }
};