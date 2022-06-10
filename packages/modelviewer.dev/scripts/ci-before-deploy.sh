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
set -x

# Switch to the package root
pushd $(dirname $0)/..

DEPLOYABLE_STATIC_FILES=( \
  index.html \
  assets \
  data \
  docs \
  examples \
  lib \
  styles \
  ATTRIBUTIONS.md \
  CNAME \
  LICENSE \
  README.md \
  node_modules/@google/model-viewer/dist \
  node_modules/focus-visible \
  node_modules/js-beautify \
  node_modules/web-animations-js \
  shared-assets/models/*.* \
  shared-assets/models/twitter \
  shared-assets/models/glTF-Sample-Models/2.0/2CylinderEngine \
  shared-assets/models/glTF-Sample-Models/2.0/AlphaBlendModeTest \
  shared-assets/models/glTF-Sample-Models/2.0/AntiqueCamera \
  shared-assets/models/glTF-Sample-Models/2.0/BoomBox \
  shared-assets/models/glTF-Sample-Models/2.0/BrainStem \
  shared-assets/models/glTF-Sample-Models/2.0/Corset \
  shared-assets/models/glTF-Sample-Models/2.0/DamagedHelmet \
  shared-assets/models/glTF-Sample-Models/2.0/Duck \
  shared-assets/models/glTF-Sample-Models/2.0/FlightHelmet \
  shared-assets/models/glTF-Sample-Models/2.0/Lantern \
  shared-assets/models/glTF-Sample-Models/2.0/MetalRoughSpheres \
  shared-assets/models/glTF-Sample-Models/2.0/Suzanne \
  shared-assets/models/glTF-Sample-Models/2.0/SpecGlossVsMetalRough \
  shared-assets/models/glTF-Sample-Models/2.0/WaterBottle \
  shared-assets/models/glTF-Sample-Models/2.0/MaterialsVariantsShoe \
  shared-assets/models/glTF-Sample-Models/2.0/Buggy \
  shared-assets/models/glTF-Sample-Models/2.0/ToyCar \
  shared-assets/environments \
  shared-assets/icons \
)

PACKAGE_ROOT=`pwd`
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
}

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
mkdir -p $DEPLOY_ROOT/editor
mkdir -p $DEPLOY_ROOT/editor/view
mkdir -p $DEPLOY_ROOT/dist

mv ../render-fidelity-tools/test/results $DEPLOY_ROOT/fidelity/results
cp ../render-fidelity-tools/test/results-viewer.html $DEPLOY_ROOT/fidelity/index.html
cp ../render-fidelity-tools/dist/* $DEPLOY_ROOT/dist/
cp ../space-opera/editor/index.html $DEPLOY_ROOT/editor/
cp ../space-opera/editor/view/index.html $DEPLOY_ROOT/editor/view/
cp ../space-opera/dist/space-opera.js $DEPLOY_ROOT/dist/

FILES_TO_PATCH_WITH_MINIFIED_BUNDLE=($(find $DEPLOY_ROOT \( -type d -name node_modules -prune \) -o -type f | grep \.html))

for file_to_patch in "${FILES_TO_PATCH_WITH_MINIFIED_BUNDLE[@]}"; do
  sed -i.bak 's/model-viewer\.js/model-viewer\.min\.js/g' $file_to_patch
  rm $file_to_patch.bak
done

# Add a "VERSION" file containing the last git commit message
git log -n 1 > $DEPLOY_ROOT/VERSION

git status --ignored

popd

set +e
set +x
