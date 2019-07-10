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

showUsage() {
  echo 'Generates IBL with cmgen if necessary.

Usage:

  genIBL.sh -i <ibl input file> [-r <renderer install path>] [-vI]

Note: script caches generated IBLs across multiple invocations. 
To force regeneration of the IBL, add the -I flag (be aware that 
this will take longer).';
}

if [ -z "$MODEL_VIEWER_CHECKOUT_DIRECTORY" ]; then
  MODEL_VIEWER_CHECKOUT_DIRECTORY=`pwd`
fi

OPTIND=1

# Argument defaults:
RENDERER_INSTALL_PATH=$MODEL_VIEWER_CHECKOUT_DIRECTORY/test/fidelity
REGENERATE_IBL=false
IBL_INPUT_FILE=""
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

FILAMENT_DIR=$RENDERER_INSTALL_PATH/Filament
IBL_DIR=$FILAMENT_DIR/IBL
CMGEN_BIN=$IBL_DIR/cmgen

IBL_FILENAME=${IBL_INPUT_FILE##*/}
IBL_BASENAME=${IBL_FILENAME%.*}
IBL_OUTPUT_PATH=$IBL_DIR/$IBL_BASENAME

if [ ! -d $IBL_DIR ]; then
  mkdir -p $IBL_DIR
fi

if [ "$REGENERATE_IBL" = true ] || [ ! -d $IBL_OUTPUT_PATH ]; then
  $CMGEN_BIN --format=ktx -x $IBL_DIR $IBL_INPUT_FILE
fi

set +e
set +x

