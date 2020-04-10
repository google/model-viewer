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

set -e

DEPLOYABLE_STATIC_FILES=( \
  index.html \
  assets \
  examples \
  lib \
  styles \
  ATTRIBUTIONS.md \
  CNAME \
  LICENSE \
  README.md \
  node_modules/@webcomponents \
  node_modules/@google/model-viewer/dist \
  node_modules/focus-visible \
  node_modules/intersection-observer \
  node_modules/@magicleap \
  node_modules/fullscreen-polyfill \
  node_modules/resize-observer-polyfill \
  shared-assets/models/*.glb \
  shared-assets/models/*.gltf \
  shared-assets/models/*.usdz \
  shared-assets/models/glTF-Sample-Models/2.0/BoomBox \
  shared-assets/models/glTF-Sample-Models/2.0/FlightHelmet \
  shared-assets/models/glTF-Sample-Models/2.0/DamagedHelmet \
  shared-assets/models/glTF-Sample-Models/2.0/Duck \
  shared-assets/models/glTF-Sample-Models/2.0/MetalRoughSpheres \
  shared-assets/models/glTF-Sample-Models/2.0/AntiqueCamera \
  shared-assets/environments \
)

PACKAGE_ROOT=$(dirname $0)/..
DEPLOY_ROOT=$PACKAGE_ROOT/dist

function copyToDeployRoot {
  path=$1

  echo "Copying $path"

  if [ -d "$path" ]; then
    directory="$path"
  else
    directory="`dirname $path`"
  fi

  echo "Creating $DEPLOY_ROOT/$directory"
  mkdir -p "$DEPLOY_ROOT/$directory"

  if [ -d "${path}" ]; then
    cp -r $path/* "$DEPLOY_ROOT/$path"
  else
    if [ -f "${path}" ]; then
      cp $path "$DEPLOY_ROOT/$path"
    else
      echo "Path not found: $path"
      exit 1
    fi
  fi

  # popd
}

pushd $PACKAGE_ROOT

mkdir -p $DEPLOY_ROOT
touch $DEPLOY_ROOT/.nojekyll

# Copy over deployable static files and directories, maintaining relative paths
for static in "${DEPLOYABLE_STATIC_FILES[@]}"; do
  echo $static
  copyToDeployRoot $static
done

set -x

# Copy the latest fidelity testing results:
mkdir -p $DEPLOY_ROOT/fidelity
mkdir -p $DEPLOY_ROOT/dist

mv ../render-fidelity-tools/test/results $DEPLOY_ROOT/fidelity/results
cp ../render-fidelity-tools/test/results-viewer.html $DEPLOY_ROOT/fidelity/index.html
cp ../render-fidelity-tools/dist/* $DEPLOY_ROOT/dist/

# Add a "VERSION" file containing the last git commit message
git log -n 1 > $DEPLOY_ROOT/VERSION

git status --ignored

popd

set +e
set +x
