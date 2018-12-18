#!/bin/bash

set -x

git checkout origin/gh-pages -- ./fidelity
LAST_RESULT="`tail -n 1 ./fidelity/manifest`"

set -e

if [ -z "$LAST_RESULT" ]; then
  echo "No previous fidelity results available for comparison!";
  exit 0;
fi

node ./scripts/compare-fidelity-results.js "./test/fidelity/results" "./fidelity/$LAST_RESULT"

set +e
set +x
