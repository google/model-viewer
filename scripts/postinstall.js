import fs from 'fs';

const THREE_REGEX = /three@[~^]?([\dvx*]+(?:[-.](?:[\dx*]+|alpha|beta))*)/gm;
let NEW_THREE_VERSION;
const THREE_PACKAGE_REGEX = /"three": ".*"/g;

try {
  const data = fs.readFileSync('packages/model-viewer/package.json', { encoding: 'utf8' });
  const match = THREE_PACKAGE_REGEX.exec(data);
  if (match) {
    NEW_THREE_VERSION = `three@${match[0].split(' ')[1].replaceAll('"', '')}`;
    console.log(`Setting three version to: ${NEW_THREE_VERSION}`);
  }
} catch (err) {
  console.error('Error reading package.json:', err);
}

function updateThreeVersion(filePath) {
  try {
    let data = fs.readFileSync(filePath, { encoding: 'utf8' });
    const oldVersionMatch = THREE_REGEX.exec(data);

    if (!oldVersionMatch) {
      // It's possible the file uses a placeholder like {{THREEJS_VERSION}}, which we want to ignore.
      console.log('No exact three version found in ' + filePath + ' (skipping replacing).');
      return;
    }

    const OLD_THREE_VERSION = oldVersionMatch[0];
    if (!OLD_THREE_VERSION || !NEW_THREE_VERSION) {
      console.error('Tried to replace ', OLD_THREE_VERSION, ' with ', NEW_THREE_VERSION);
      return;
    }

    data = data.replaceAll(OLD_THREE_VERSION, NEW_THREE_VERSION);
    fs.writeFileSync(filePath, data, { encoding: 'utf8' });
    console.log(`Updated ${filePath}`);

  } catch (err) {
    console.error(`Error updating ${filePath}:`, err);
  }
}

// Intentionally removed README.md and postprocessing/index.html 
// to prevent dirtying the Git tree, as they rely on {{THREEJS_VERSION}} templates now.
