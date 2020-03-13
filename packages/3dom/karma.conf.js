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

const {applyKarmaHacks} = require('./shared-assets/scripts/karma-hacks.js');

const buildIdentifier = process.env.BROWSER_STACK_BUILD_NAME || `${Date.now()}`;

applyKarmaHacks(buildIdentifier);

// This terrible hack needed in order to specify a custom BrowserStack
// tunnel identifier. Failures to do so results in overlapping tunnels when
// builds run in parallel:
{
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
                buildIdentifier);
            config.localIdentifier = buildIdentifier;
          }
          return start.apply(this, args);
        };
        return local;
      };
      resolvedModule.Local = WrappedLocal;
    }
    return resolvedModule;
  };
}

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
        build: buildIdentifier,
        tunnelIdentifier: buildIdentifier
      },

      reporters: ['BrowserStack', 'mocha'],

      customLaunchers: browserStackLaunchers,
      browsers: [...config.browsers, ...Object.keys(browserStackLaunchers)],
    });
  }
};