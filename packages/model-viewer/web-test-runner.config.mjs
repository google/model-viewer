// import {esbuildPlugin} from '@web/dev-server-esbuild';

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
  testFramework: {
    config: {
      ui: 'tdd',
    },
  },
  // plugins: [esbuildPlugin({ts: true})],
};