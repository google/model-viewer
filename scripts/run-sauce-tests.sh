#!/usr/bin/env bash

set -e
set -x

# Run the standard battery of tests for "modern" browsers:
npm run wct-sauce-modern

# Create legacy bundles:
npm run create-legacy-bundles

# Run an additional battery of tests against a special bundle targetting
# "legacy" browsers:
npm run wct-sauce-legacy

set +x
set +e
