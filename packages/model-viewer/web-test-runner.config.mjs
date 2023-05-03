// import {esbuildPlugin} from '@web/dev-server-esbuild';
import {devices, playwrightLauncher} from '@web/test-runner-playwright';

export default {
  concurrency: 10,
  nodeResolve: true,
  // in a monorepo you need to set set the root dir to resolve modules
  rootDir: '../../',
  testsFinishTimeout: 300000,
  testFramework: {
    config: {
      ui: 'tdd',
      timeout: '60000',
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