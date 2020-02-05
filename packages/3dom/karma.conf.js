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
  const packages = config.packages ? config.packages.split(',') : [];
  const fileEntries = [];
  const defaultFileEntry = [];

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
        pattern: 'node_modules/@jsantell/event-target/dist/event-target.js',
        watched: false
      },
      {pattern: 'lib/**/*-spec.js', watched: true, type: 'module'},
    ],

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
      'Edge 79': {
        base: 'SauceLabs',
        browserName: 'microsoftedge',
        version: '79.0',
        platform: 'Windows 10',
      },
      'Safari 12.1': {
        base: 'SauceLabs',
        browserName: 'safari',
        version: '12.1',
        platform: 'macOS 10.13',
      },
      'Safari 13.0': {
        base: 'SauceLabs',
        browserName: 'safari',
        version: '13.0',
        platform: 'macOS 10.13',
      },
      'Firefox 68.0': {
        base: 'SauceLabs',
        browserName: 'firefox',
        platform: 'Windows 10',
        version: '68.0'
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

      // TODO(aomarks) Update the browser versions here.
      customLaunchers: sauceLaunchers,
      browsers: [...config.browsers, ...Object.keys(sauceLaunchers)],
    });
  }
};