#!/bin/bash

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
