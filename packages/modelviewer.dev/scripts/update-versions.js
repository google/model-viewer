#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

// ESM module resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
    packagePaths: {
        modelViewer: path.resolve(__dirname, '../../model-viewer/package.json'),
        effects: path.resolve(__dirname, '../../model-viewer-effects/package.json'),
    },
    targetFiles: [
        '../dist/index.html',
        '../dist/data/faq.json',
        '../dist/data/docs.json',
        '../dist/examples/postprocessing/index.html',
        '../dist/examples/twitter/player.html',
    ].map(file => path.resolve(__dirname, file)),
    placeholders: {
        modelViewer: '{{MODELVIEWER_VERSION}}',
        three: '{{THREEJS_VERSION}}',
        postprocessing: '{{POSTPROCESSING_VERSION}}',
    },
};

// ============================================================
// LOGGER UTILITIES
// ============================================================

const logger = {
    success: (msg) => console.log(chalk.green(`✓ ${msg}`)),
    error: (msg) => console.log(chalk.red(`✗ ${msg}`)),
    warning: (msg) => console.log(chalk.yellow(`⚠ ${msg}`)),
    info: (msg) => console.log(chalk.blue(`ℹ ${msg}`)),
    separator: () => console.log(''),
};

// ============================================================
// FILE OPERATIONS
// ============================================================

/**
 * Reads and parses a JSON file safely
 * @param {string} filePath - Path to JSON file
 * @returns {Object|null} Parsed JSON or null on error
 */
const readJsonFile = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        logger.error(`Error reading ${filePath}: ${error.message}`);
        return null;
    }
};

/**
 * Replaces placeholders in a file with actual values
 * @param {string} filePath - Target file path
 * @param {Object} replacements - Key-value pairs for replacement
 * @returns {boolean} Success status
 */
const replacePlaceholdersInFile = (filePath, replacements) => {
    if (!fs.existsSync(filePath)) {
        logger.warning(`File ${filePath} does not exist - skipped`);
        return false;
    }

    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let hasChanges = false;

        for (const [placeholder, value] of Object.entries(replacements)) {
            if (content.includes(placeholder)) {
                content = content.replaceAll(placeholder, value);
                hasChanges = true;
            } else {
                logger.warning(`Placeholder ${placeholder} not found in ${path.basename(filePath)}`);
            }
        }

        if (hasChanges) {
            fs.writeFileSync(filePath, content, 'utf8');
            logger.success(`Updated: ${path.basename(filePath)}`);
            return true;
        }

        return false;
    } catch (error) {
        logger.error(`Error processing ${filePath}: ${error.message}`);
        return false;
    }
};

// ============================================================
// VERSION EXTRACTION
// ============================================================

/**
 * Extracts package version from package.json
 * @param {Object} packageJson - Parsed package.json
 * @param {string} packageName - Name of the package
 * @returns {string} Cleaned version string
 */
const extractPackageVersion = (packageJson, packageName) => {
    const version =
        packageJson.dependencies?.[packageName] ||
        packageJson.devDependencies?.[packageName] ||
        '';

    return version.replace(/^[^\d]*/, ''); // Remove leading symbols (^, ~, etc.)
};

/**
 * Collects all required versions from package.json files
 * @returns {Object|null} Version object or null on error
 */
const collectVersions = () => {
    const modelViewerPkg = readJsonFile(CONFIG.packagePaths.modelViewer);
    const effectsPkg = readJsonFile(CONFIG.packagePaths.effects);

    if (!modelViewerPkg || !effectsPkg) {
        return null;
    }

    const versions = {
        three: extractPackageVersion(modelViewerPkg, 'three'),
        modelViewer: modelViewerPkg.version || '',
        postprocessing: extractPackageVersion(effectsPkg, 'postprocessing'),
    };

    // Validate all versions are present
    const missingVersions = Object.entries(versions)
        .filter(([_, version]) => !version)
        .map(([key]) => key);

    if (missingVersions.length > 0) {
        logger.error(`Missing versions: ${missingVersions.join(', ')}`);
        return null;
    }

    return versions;
};

// ============================================================
// MAIN EXECUTION
// ============================================================

/**
 * Main execution function
 */
const main = () => {
    logger.info('Starting version replacement...');
    logger.separator();

    // Collect versions
    const versions = collectVersions();
    if (!versions) {
        process.exit(1);
    }

    // Display versions
    logger.info(`three.js: ${versions.three}`);
    logger.info(`model-viewer: ${versions.modelViewer}`);
    logger.info(`postprocessing: ${versions.postprocessing}`);
    logger.separator();

    // Prepare replacements
    const replacements = {
        [CONFIG.placeholders.three]: versions.three,
        [CONFIG.placeholders.modelViewer]: versions.modelViewer,
        [CONFIG.placeholders.postprocessing]: versions.postprocessing,
    };

    // Process all target files
    const results = CONFIG.targetFiles.map(file =>
        replacePlaceholdersInFile(file, replacements)
    );

    const successCount = results.filter(Boolean).length;
    const totalCount = CONFIG.targetFiles.length;

    // Final summary
    logger.separator();
    if (successCount === totalCount) {
        logger.success(`All ${totalCount} files updated successfully!`);
    } else if (successCount > 0) {
        logger.warning(`${successCount} out of ${totalCount} files updated`);
    } else {
        logger.error('No files were updated!');
        process.exit(1);
    }
};

// Execute
main();