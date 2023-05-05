// import {esbuildPlugin} from '@web/dev-server-esbuild';
import {devices, playwrightLauncher} from '@web/test-runner-playwright';

export default {
  concurrency: 10,
  nodeResolve: true,
  files: 'lib/test/**/*-spec.js',
  // in a monorepo you need to set set the root dir to resolve modules
  rootDir: '../../',
  browserLogs: false,
  filterBrowserLogs:
      (log) => {
        return log.type === 'error';
      },
  testRunnerHtml: testFramework => `
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body>
      <script type="module" src="${testFramework}"></script>
    </body>
  </html>`,
  testsFinishTimeout: 300000,
  testFramework: {
    config: {
      ui: 'tdd',
      timeout: '240000',
    },
  },
  // plugins: [esbuildPlugin({ts: true})],
  browsers: [
    playwrightLauncher({
      product: 'webkit',
      launchOptions: {
        retries: 3,
      },
      createBrowserContext({browser}) {
        return browser.newContext({...devices['iPhone X']});
      },
    }),
    playwrightLauncher({
      product: 'webkit',
      launchOptions: {
        retries: 3,
      },
      createBrowserContext({browser}) {
        return browser.newContext({...devices['Desktop Safari']});
      },
    }),
    playwrightLauncher({
      product: 'chromium',
      launchOptions: {
        retries: 3,
      },
      createBrowserContext({browser}) {
        return browser.newContext({...devices['Galaxy S9+']});
      },
    }),
    playwrightLauncher({
      product: 'chromium',
      launchOptions: {
        retries: 3,
      },
      createBrowserContext({browser}) {
        return browser.newContext({...devices['Desktop Chrome']});
      },
    }),
  ],
};