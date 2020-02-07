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
      },
    },

    reporters: ['mocha'],

    mochaReporter: {output: 'autowatch'},

    // Note setting --browsers on the command-line always overrides this list.
    browsers: [
      'ChromeHeadless',
    ],
  });

  if (process.env.USE_SAUCE) {
    if (!process.env.SAUCE_USERNAME || !process.env.SAUCE_ACCESS_KEY) {
      throw new Error(
          'SAUCE_USERNAME and SAUCE_ACCESS_KEY must be set with USE_SAUCE')
    }

    const sauceLaunchers = {
      // 'IE11': {
      //   base: 'SauceLabs',
      //   browserName: 'internet explorer',
      //   version: '11',
      //   platform: 'Windows 8.1',
      // },
      'Edge (latest)': {
        base: 'SauceLabs',
        browserName: 'microsoftedge',
        version: 'latest',
        platform: 'Windows 10',
      },
      'Safari (latest - 1)': {
        base: 'SauceLabs',
        browserName: 'safari',
        version: 'latest-1',
        platform: 'macOS 10.13',
      },
      'Safari (latest)': {
        base: 'SauceLabs',
        browserName: 'safari',
        version: 'latest',
        platform: 'macOS 10.13',
      },
      'Firefox (latest)': {
        base: 'SauceLabs',
        browserName: 'firefox',
        platform: 'Windows 10',
        version: 'latest'
      },
      'Firefox (latest - 1)': {
        base: 'SauceLabs',
        browserName: 'firefox',
        platform: 'Windows 10',
        version: 'latest-1'
      }
    };

    config.set({
      sauceLabs: {
        idleTimeout: 600,
        testName: '3DOM Unit Tests',
        build: process.env.SAUCE_BUILD_ID,
        tunnelIdentifier: process.env.SAUCE_TUNNEL_ID,
      },
      // Attempt to de-flake Sauce Labs tests on TravisCI.
      transports: ['polling'],
      browserDisconnectTolerance: 1,
      reporters: ['saucelabs', 'mocha'],

      customLaunchers: sauceLaunchers,
      browsers: [...config.browsers, ...Object.keys(sauceLaunchers)],
    });
  }
};