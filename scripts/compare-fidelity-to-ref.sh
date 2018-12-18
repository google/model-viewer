#!/bin/bash

set -x
set -e

if [ -z "$TMPDIR" ]; then
  TMPDIR="/tmp/";
fi

REF=$1
CLONE_DIR="${TMPDIR}model-viewer-master"
CURRENT_DIR="`pwd`"

if [ -d "$CLONE_DIR" ]; then
  rm -rf "$CLONE_DIR"
fi

git clone --branch $REF ./ "$CLONE_DIR"
cd "$CLONE_DIR"

npm install
npm run build

set +e

npm run check-fidelity

cd "$CURRENT_DIR"

node ./scripts/compare-fidelity-results.js "$CURRENT_DIR/test/fidelity/results" "$CLONE_DIR/test/fidelity/results"

set +x
