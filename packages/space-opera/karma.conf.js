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

/**
 * Karma configuration
 * @param {!Object} config config object from Karma
 */
module.exports = function(config) {
  config.set({
    basePath: '',
    reporters: ['spec'],
    specReporter: {
      maxLogLines: 10,              // limit number of lines logged per test
      suppressErrorSummary: false,  // print error summary
      suppressFailed: false,        // print information about failed tests
      suppressPassed: false,        // print information about passed tests
      suppressSkipped: false,       // print information about skipped tests
      showSpecTiming: false  // do not print the time elapsed for each spec
    },
    plugins: [
      require.resolve('@open-wc/karma-esm'),
      'karma-*',
      'karma-spec-reporter'
    ],
    frameworks: ['esm', 'jasmine'],
    client: {jasmine: {timeoutInterval: 10000}},
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
      'ChromeHeadlessNoSandbox',
    ],

    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox'],
      }
    }
  });
};
