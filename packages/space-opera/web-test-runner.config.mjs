// import {esbuildPlugin} from '@web/dev-server-esbuild';
import {devices, playwrightLauncher} from '@web/test-runner-playwright';

export default {
  concurrency: 10,
  nodeResolve: true,
  files: 'lib/**/*_test.js',
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
      <script>window.process = { env: { NODE_ENV: "development" } }</script>
      <script type="module" src="${testFramework}"></script>
    </body>
  </html>`,
  testsFinishTimeout: 300000,
  testFramework: {
    config: {
      ui: 'tdd',
      timeout: '120000',
    },
  },
  // plugins: [esbuildPlugin({ts: true})],
  // browsers:
  //     [
  //       playwrightLauncher({
  //         product: 'webkit',
  //         createBrowserContext({browser}) {
  //           return browser.newContext({...devices['iPhone X']});
  //         },
  //       }),
  //     ],
};