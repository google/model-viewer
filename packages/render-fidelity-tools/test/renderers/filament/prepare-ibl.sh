#!/bin/bash

##
# Copyright 2019 Google Inc. All Rights Reserved.
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

showUsage() {
  echo 'Generates IBL with cmgen if necessary.

Usage:

  prepare-ibl.sh -i <ibl input file> [-vI]

Note: script caches generated IBLs across multiple invocations. 
To force regeneration of the IBL, add the -I flag (be aware that 
this will take longer).';
}

if [ -z "$MODEL_VIEWER_CHECKOUT_DIRECTORY" ]; then
  MODEL_VIEWER_CHECKOUT_DIRECTORY=`pwd`
fi

OPTIND=1

# Argument defaults:
REGENERATE_IBL=false
IBL_INPUT_FILE="$LIGHTING"
VERBOSE=false

while getopts "?vw:h:i:m:o:IF" opt; do
    case "$opt" in
    \?)
        showUsage
        exit 0
        ;;
    v)  VERBOSE=true
        ;;
    r)  RENDERER_INSTALL_PATH=$OPTARG
        ;;
    i)  IBL_INPUT_FILE=$OPTARG
        ;;
    I)  REGENERATE_IBL=true
        ;;
    esac
done


shift $((OPTIND-1))

[ "${1:-}" = "--" ] && shift

if [ -z "$IBL_INPUT_FILE" ]; then
  showUsage
  exit 1
fi

set -e

if [ "$VERBOSE" = true ]; then
  set -x
fi

fetchCmgen() {
  CMGEN_INSTALL_DIRECTORY=`pwd`

  if [ -f "$CMGEN_INSTALL_DIRECTORY/cmgen" ]; then
    # Nothing to do...
    return
  fi

  if [[ "$OSTYPE" == "linux-gnu" ]]; then
    FILAMENT_PLATFORM="linux"
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    FILAMENT_PLATFORM="mac"
  else
    echo "Cannot get cmgen binary; unsupported platform";
    exit 1
  fi

  FILAMENT_DISTRIBUTION_URL="https://github.com/google/filament/releases/download/v1.4.5/filament-20200127-$FILAMENT_PLATFORM.tgz"

  pushd $TMPDIR
  curl -L $FILAMENT_DISTRIBUTION_URL -o filament.tgz
  tar -xvf ./filament.tgz
  cp ./filament/bin/cmgen $CMGEN_INSTALL_DIRECTORY
  popd
}

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

pushd $SCRIPT_DIR
fetchCmgen
popd

IBL_DIR=$SCRIPT_DIR/ktx
CMGEN_BIN=$SCRIPT_DIR/cmgen

IBL_FILENAME=${IBL_INPUT_FILE##*/}
IBL_EXTENSION=${IBL_FILENAME##*.}
IBL_BASENAME=${IBL_FILENAME%.*}
IBL_OUTPUT_PATH=$IBL_DIR/$IBL_BASENAME


if [ ! -d $IBL_DIR ]; then
  mkdir -p $IBL_DIR
fi

if [ "$REGENERATE_IBL" = true ] || [ ! -d $IBL_OUTPUT_PATH ]; then
  if [ "$IBL_EXTENSION" == "jpg" ]; then
    convert "$IBL_INPUT_FILE" "$IBL_DIR/$IBL_BASENAME.png"
    IBL_INPUT_FILE="$IBL_DIR/$IBL_BASENAME.png"
  fi

  $CMGEN_BIN --format=ktx -x $IBL_OUTPUT_PATH $IBL_INPUT_FILE
fi

set +e
set +x

