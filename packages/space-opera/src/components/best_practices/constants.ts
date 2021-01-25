export const modelViewerTemplate = `
<!doctype html>
<html lang="en">
  <head>
    <title>&lt;model-viewer&gt; template</title>
    <meta charset="utf-8">
    <meta name="description" content="&lt;model-viewer&gt; template">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link type="text/css" href="./styles.css" rel="stylesheet"/>
    <!-- 💁 OPTIONAL: The :focus-visible polyfill removes the focus ring for some input types -->
    <script src="https://unpkg.com/focus-visible@5.0.2/dist/focus-visible.js" defer></script>
  </head>
  <body>
    <div>modelviewer</div>
    <script>progressbar</script>
    <!-- Loads <model-viewer> for modern browsers: -->
    <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
  </body>
</html>
`;

export const progressBar = `
// Handles loading the events for <model-viewer>'s slotted progress bar
const onProgress = (event) => {
  const progressBar = event.target.querySelector('.progress-bar');
  const updatingBar = event.target.querySelector('.update-bar');
  updatingBar.style.width = \`\${event.detail.totalProgress * 100}%\`;
  if (event.detail.totalProgress === 1) {
    progressBar.classList.add('hide');
  } else {
    progressBar.classList.remove('hide');
    if (event.detail.totalProgress === 0) {
      event.target.querySelector('.center-pre-prompt')?.classList.add('hide');
    }
  }
};
document.querySelector('model-viewer').addEventListener('progress', onProgress);
`