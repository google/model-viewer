#!/bin/bash

##
# Copyright 2020 Google Inc. All Rights Reserved.
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

DEPLOY_ROOT=$(dirname $0)/../

pushd $DEPLOY_ROOT

touch .nojekyll

echo 'node_modules/*' > .gitignore
echo '!node_modules/@webcomponents' >> .gitignore
echo '!node_modules/focus-visible' >> .gitignore
echo '!node_modules/intersection-observer' >> .gitignore
echo '!node_modules/@magicleap' >> .gitignore
echo '!node_modules/fullscreen-polyfill' >> .gitignore
echo '!node_modules/resize-observer-polyfill' >> .gitignore
echo '!node_modules/filament' >> .gitignore
echo '!node_modules/@google' >> .gitignore

mv ../render-fidelity-tools/test/results ./fidelity

pushd ./node_modules/\@google

MODEL_VIEWER_DIR=$(readlink ./model-viewer)
SHARED_ASSETS_DIR=$(readlink ./model-viewer-shared-assets)

rm ./model-viewer ./model-viewer-shared-assets

mv $MODEL_VIEWER_DIR ./model-viewer

pushd ./model-viewer
echo '*' > .gitignore
echo '!dist' >> .gitignore
popd

mv $SHARED_ASSETS_DIR ./model-viewer-shared-assets

popd

git log -n 1 > VERSION

popd

set +x