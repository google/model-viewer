#!/usr/bin/env node
/* eslint-disable no-undef */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

// Resolve __dirname and __filename in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colored logging helpers
const printSuccess = (message) => console.log(chalk.green(`✓ ${message}`));
const printError = (message) => console.log(chalk.red(`✗ ${message}`));
const printWarning = (message) => console.log(chalk.yellow(`⚠ ${message}`));
const printInfo = (message) => console.log(chalk.blue(`ℹ ${message}`));

// Path to the target package.json
const packageJsonPath = path.resolve(__dirname, '../../model-viewer/package.json');

if (!fs.existsSync(packageJsonPath)) {
  printError(`package.json not found at ${packageJsonPath}`);
  process.exit(1);
}

let threeVersion = '';
let modelviewerVersion = '';

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Extract versions from dependencies or devDependencies
  if (packageJson.dependencies?.three) {
    threeVersion = packageJson.dependencies.three;
  } else if (packageJson.devDependencies?.three) {
    threeVersion = packageJson.devDependencies.three;
  }

  modelviewerVersion = packageJson.version || '';
} catch (e) {
  printError(`Error reading or parsing package.json: ${e.message}`);
  process.exit(1);
}

if (!threeVersion || !modelviewerVersion) {
  printError('Could not find three.js or model-viewer version!');
  process.exit(1);
}

// Remove any leading symbols (e.g., ^ or ~) from version
threeVersion = threeVersion.replace(/^[^\d]*/, '');

printInfo(`three.js version: ${threeVersion}`);
printInfo(`model-viewer version: ${modelviewerVersion}`);

// Placeholders to be replaced
const PLACEHOLDERS = {
  '{{MODELVIEWER_VERSION}}': modelviewerVersion,
  '{{THREEJS_VERSION}}': threeVersion,
};

// Target files to update
const TARGET_FILES = [
  path.resolve(__dirname, '../dist/index.html'),
  path.resolve(__dirname, '../dist/data/faq.json'),
  path.resolve(__dirname, '../dist/data/docs.json'),
];

// Function to replace version placeholders in a file
const replaceVersionInFile = (file) => {
  if (!fs.existsSync(file)) {
    printWarning(`File ${file} does not exist - skipped`);
    return false;
  }

  let content = fs.readFileSync(file, 'utf8');
  let replaced = false;

  for (const [placeholder, value] of Object.entries(PLACEHOLDERS)) {
    if (content.includes(placeholder)) {
      content = content.split(placeholder).join(value);
      replaced = true;
    } else {
      printWarning(`Placeholder ${placeholder} not found in ${file} - skipped`);
    }
  }

  if (replaced) {
    try {
      fs.writeFileSync(file, content, 'utf8');
      printSuccess(`File ${file} updated successfully`);
      return true;
    } catch (e) {
      printError(`Error writing to file ${file}: ${e.message}`);
      return false;
    }
  } else {
    return false;
  }
};

// Entry point
const main = () => {
  printInfo('Starting version replacement...');
  console.log('');

  let successCount = 0;

  for (const file of TARGET_FILES) {
    if (replaceVersionInFile(file)) {
      successCount++;
    }
  }

  console.log('');
  if (successCount === TARGET_FILES.length) {
    printSuccess('All files updated successfully!');
  } else if (successCount > 0) {
    printWarning(`${successCount} out of ${TARGET_FILES.length} files updated`);
  } else {
    printError('No files were updated!');
  }
};

main();
