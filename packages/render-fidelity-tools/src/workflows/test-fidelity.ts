import module from 'module';

const require = module.createRequire(import.meta.url);
const core = require('@actions/core');

async function run(): Promise<void> {
  try {
    throw new Error('i just want to fail you !');
  } catch (error) {
    console.log(1);
    core.setFailed(error.message);
  }
}

run();
