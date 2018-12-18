#!/usr/bin/env bash

set -x
set -e

if [ -z "$TRAVIS_TAG" ]; then
  echo '$TRAVIS_TAG is not set!';
  exit 1;
fi

TEST_RESULTS="./test/fidelity/results"
FIDELITY_ROOT="./fidelity"
RECORD_MANIFEST="$FIDELITY_ROOT/manifest"
OUTPUT_DIRECTORY="$FIDELITY_ROOT/$TRAVIS_TAG"

set +e

git checkout origin/gh-pages -- ./fidelity

set -e

if [[ ! -d $FIDELITY_ROOT ]]; then
  mkdir -p $FIDELITY_ROOT;
fi

if [[ -d $OUTPUT_DIRECTORY ]]; then
  rm -rf $OUTPUT_DIRECTORY;
fi

cp -r $TEST_RESULTS $OUTPUT_DIRECTORY

# All directories in the root are recorded in a file for later reference
# by the frontend of the Github Pages deployment:
ls -l $FIDELITY_ROOT | egrep '^d' | awk '{ print $9 }' > $RECORD_MANIFEST

set +x
set +e
