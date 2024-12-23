#!/usr/bin/env bash

##
# Copyright 2018 Google Inc. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the 'License');
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
##

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
