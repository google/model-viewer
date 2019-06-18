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

##
# This script installs Filament or updates it in place if it is already present.
# In the future, it will also be responsible for bootstrapping other renderers.
##

# Filament
echo '🛠 Building Filament';
echo '✋ NOTE: If this fails, please refer to the Filament README to learn how
✋ to bootstrap your environment for building Filament:
✋ https://github.com/google/filament/'

if [ "$VERBOSE" = true ]; then
  set -x
fi

set -e

FILAMENT_REPO="https://github.com/google/filament.git"
FILAMENT_DIR=$RENDERER_BASE_PATH/filament
FILAMENT_PATCH_PATH=$MODEL_VIEWER_CHECKOUT_DIRECTORY/src/test/fidelity/filament.patch
GLTF_RENDERER_CPP_PATH=$MODEL_VIEWER_CHECKOUT_DIRECTORY/src/test/fidelity/gltf_renderer.cpp

if [ -d "$FILAMENT_DIR" ] && [ "$REBUILD_EVERYTHING" = true ]; then
  rm -rf $FILAMENT_DIR
fi

if [ ! -d "$FILAMENT_DIR" ]; then
  git clone --depth=1 $FILAMENT_REPO $FILAMENT_DIR
fi

pushd $FILAMENT_DIR

git fetch --depth=1 origin
git reset --hard origin/master

git apply $FILAMENT_PATCH_PATH
cp $GLTF_RENDERER_CPP_PATH $FILAMENT_DIR/samples

# Export critical environment variables for building Filament
export CXXFLAGS=-stdlib=libc++
if [ "Linux" = $(uname -s) ]; then
  export CC=clang-7
  export CXX=clang++-7
  export FILAMENT_REQUIRES_CXXABI=true
elif [ "Darwin" = $(uname -s) ]; then
  # no customizations needed
  :
else
  echo "unknown platform: $(uname -s)"
  exit 1
fi

./build.sh -j release

echo '✅ Filament is ready to go'

popd

set +e
set +x
