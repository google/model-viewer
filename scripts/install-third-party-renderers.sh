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

showUsage() {
  echo 'Build or update third-party renderers such as Filament.

Usage:

  install-third-party-renderers.sh [-p <install path>] [-fv]

Note: use -f to force remove and rebuild everything from scratch!

Also note: by default, renderers will be installed to the "renderers" directory
of the <model-viewer> repository.';
}


OPTIND=1

if [ -z "$MODEL_VIEWER_CHECKOUT_DIRECTORY" ]; then
  MODEL_VIEWER_CHECKOUT_DIRECTORY=`pwd`
fi

# Argument defaults:
VERBOSE=false
REBUILD_EVERTHING=false
RENDERER_BASE_PATH=$MODEL_VIEWER_CHECKOUT_DIRECTORY/renderers

while getopts "?vpf" opt; do
    case "$opt" in
    \?)
        showUsage
        exit 0
        ;;
    v)  VERBOSE=true
        ;;
    p)  RENDERER_BASE_PATH=$OPTARG
        ;;
    f)  REBUILD_EVERYTHING=true
        ;;
    esac
done

export REBUILD_EVERTHING RENDERER_BASE_PATH VERBOSE MODEL_VIEWER_CHECKOUT_DIRECTORY

set -e

if [ "$VERBOSE" = true ]; then
  set -x
fi

for renderer in `ls -1 scripts/renderers/*-install.sh`; do
  ${renderer}
done

# TODO: Khronos glTF Renderer

set +e
set +x
