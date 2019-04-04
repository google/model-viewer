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
  echo 'Generate a screenshot of a model using Filament customized for comparisons
to <model-viewer>. Generates IBL with cmgen if necessary.

Usage:

  filament-screenshot.sh -i <ibl input file> -m <model path> -o <output file> \
      [-w <render width>] [-h <render height>] [-r <renderer install path>] \
      [-vI]

Note: script caches Filament repo and non-screenshot artifacts across
multiple invocations. To force regeneration of the IBL, add the -I flag (be
aware that this will take longer).';
}

if [ -z "$MODEL_VIEWER_CHECKOUT_DIRECTORY" ]; then
  MODEL_VIEWER_CHECKOUT_DIRECTORY=`pwd`
fi

OPTIND=1

# Argument defaults:
RENDERER_INSTALL_PATH=$MODEL_VIEWER_CHECKOUT_DIRECTORY/renderers
REGENERATE_IBL=false
IBL_INPUT_FILE=""
MODEL_PATH=""
RENDER_WIDTH=768
RENDER_HEIGHT=768
SCREENSHOT_OUTPUT_FILE=""
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
    w)  RENDER_WIDTH=$OPTARG
        ;;
    h)  RENDER_HEIGHT=$OPTARG
        ;;
    i)  IBL_INPUT_FILE=$OPTARG
        ;;
    m)  MODEL_PATH=$OPTARG
        ;;
    o)  SCREENSHOT_OUTPUT_FILE=$OPTARG
        ;;
    I)  REGENERATE_IBL=true
        ;;
    esac
done

shift $((OPTIND-1))

[ "${1:-}" = "--" ] && shift

if [ -z "$IBL_INPUT_FILE" ] || [ -z "$MODEL_PATH" ] || [ -z "$SCREENSHOT_OUTPUT_FILE" ]; then
  showUsage
  exit 1
fi

set -e

if [ "$VERBOSE" = true ]; then
  set -x
fi

FILAMENT_REPO="https://github.com/google/filament.git"
FILAMENT_DIR=$RENDERER_INSTALL_PATH/filament
IBL_DIR=$FILAMENT_DIR/ibl/tmp
ASSETS_DIR=$MODEL_VIEWER_CHECKOUT_DIRECTORY/examples/assets
GLTF_RENDERER_BIN=$FILAMENT_DIR/out/cmake-release/samples/gltf_renderer
CMGEN_BIN=$FILAMENT_DIR/out/cmake-release/tools/cmgen/cmgen

IBL_FILENAME=${IBL_INPUT_FILE##*/}
IBL_BASENAME=${IBL_FILENAME%.*}
IBL_OUTPUT_PATH=$IBL_DIR/$IBL_BASENAME

if [ ! -d $IBL_DIR ]; then
  mkdir -p $IBL_DIR
fi

if [ "$REGENERATE_IBL" = true ] || [ ! -d $IBL_OUTPUT_PATH ]; then
  $CMGEN_BIN -x $IBL_DIR $IBL_INPUT_FILE
fi

if [ -f $SCREENSHOT_OUTPUT_FILE ]; then
  rm $SCREENSHOT_OUTPUT_FILE
fi

"$GLTF_RENDERER_BIN" -i "$IBL_OUTPUT_PATH" -w $RENDER_WIDTH -h $RENDER_HEIGHT -o "$SCREENSHOT_OUTPUT_FILE" "$MODEL_PATH"

set +e
set +x

