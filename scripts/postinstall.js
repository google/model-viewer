const fs = require('fs');
const THREE_REGEX = /three@[~^]?([\dvx*]+(?:[-.](?:[\dx*]+|alpha|beta))*)/gm;
let NEW_THREE_VERSION;
const THREE_PACKAGE_REGEX = /"three": ".*"/g;
fs.readFile('package.json', {encoding: 'utf8'}, (err, data) => {
  NEW_THREE_VERSION = `three@${THREE_PACKAGE_REGEX.exec(data)[0].split(' ')[1].replaceAll('"', '')}`;
  console.log(NEW_THREE_VERSION);
});

function updateThreeVersion(filePath) {
  fs.readFile(filePath, {encoding: 'utf8'}, (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    const OLD_THREE_VERSION = THREE_REGEX.exec(data)[0];
    data = data.replaceAll(OLD_THREE_VERSION, NEW_THREE_VERSION);
    fs.writeFile(filePath, data, {encoding: 'utf8'}, (err) => {
      if (err) console.log(err);
    });
  });
}

updateThreeVersion('../model-viewer-effects/README.md');
updateThreeVersion('../modelviewer.dev/examples/postprocessing/index.html');
