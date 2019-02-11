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
  echo 'Generate a screenshot of a model using Filament customized for comparisons
to <model-viewer>. Builds Filament and generates IBL with cmgen if necessary.

Usage:

  filament-screenshot.sh -i <ibl input path> -m <model path> -o <output path> \
      [-w <render width>] [-h <render height>] [-vIF]

Note: script caches Filament repo and non-screenshot artifacts across
multiple invocations. To force regeneration of the IBL, add the -I flag. To
force re-clone and rebuild of Filament, pass the -F flag (be aware that this
will cause screenshot creation take a lot longer).';
}

OPTIND=1

# Argument defaults:
REGENERATE_IBL=false
REBUILD_EVERYTHING=false
IBL_INPUT_PATH=""
MODEL_PATH=""
RENDER_WIDTH=768
RENDER_HEIGHT=768
SCREENSHOT_OUTPUT_PATH=""
VERBOSE=false

while getopts "?vw:h:i:m:o:IF" opt; do
    case "$opt" in
    \?)
        showUsage
        exit 0
        ;;
    v)  VERBOSE=true
        ;;
    w)  RENDER_WIDTH=$OPTARG
        ;;
    h)  RENDER_HEIGHT=$OPTARG
        ;;
    i)  IBL_INPUT_PATH=$OPTARG
        ;;
    m)  MODEL_PATH=$OPTARG
        ;;
    o)  SCREENSHOT_OUTPUT_PATH=$OPTARG
        ;;
    I)  REGENERATE_IBL=true
        ;;
    F)  REBUILD_EVERYTHING=true
        ;;
    esac
done

shift $((OPTIND-1))

[ "${1:-}" = "--" ] && shift

if [ -z "$IBL_INPUT_PATH" ] || [ -z "$MODEL_PATH" ] || [ -z "$SCREENSHOT_OUTPUT_PATH" ]; then
  showUsage
  exit 1
fi

set -e

if [ "$VERBOSE" = true ]; then
  set -x
fi

if [ -z "$TMPDIR" ]; then
  TMPDIR="/tmp/";
fi

FILAMENT_REPO="https://github.com/google/filament.git"
MODEL_VIEWER_DIR=`pwd`
FILAMENT_DIR=${TMPDIR%%/}/filament
IBL_DIR=$FILAMENT_DIR/ibl/tmp
ASSETS_DIR=$MODEL_VIEWER_DIR/examples/assets
GLTF_RENDERER_BIN=$FILAMENT_DIR/out/cmake-release/samples/gltf_renderer
CMGEN_BIN=$FILAMENT_DIR/out/cmake-release/tools/cmgen/cmgen
FILAMENT_PATCH_PATH=$MODEL_VIEWER_DIR/src/test/fidelity/filament.patch
GLTF_RENDERER_CPP_PATH=$MODEL_VIEWER_DIR/src/test/fidelity/gltf_renderer.cpp

IBL_FILENAME=${IBL_INPUT_PATH##*/}
IBL_BASENAME=${IBL_FILENAME%.*}
IBL_OUTPUT_PATH=$IBL_DIR/$IBL_BASENAME

if [ -d "$FILAMENT_DIR" ] && [ "$REBUILD_EVERYTHING" = true ]; then
  rm -rf $FILAMENT_DIR
fi

if [ ! -d "$FILAMENT_DIR" ]; then
  git clone --depth=1 $FILAMENT_REPO $FILAMENT_DIR

  pushd $FILAMENT_DIR

  git apply $FILAMENT_PATCH_PATH

  cp $GLTF_RENDERER_CPP_PATH $FILAMENT_DIR/samples

  ./build.sh -j release

  popd
fi

if [ ! -d $IBL_DIR ]; then
  mkdir -p $IBL_DIR
fi

if [ "$REGENERATE_IBL" = true ] || [ ! -d $IBL_OUTPUT_PATH ]; then
  $CMGEN_BIN -x $IBL_DIR $IBL_INPUT_PATH
fi

if [ -f $SCREENSHOT_OUTPUT_PATH ]; then
  rm $SCREENSHOT_OUTPUT_PATH
fi

$GLTF_RENDERER_BIN -i $IBL_OUTPUT_PATH -w $RENDER_WIDTH -h $RENDER_HEIGHT -o $SCREENSHOT_OUTPUT_PATH $MODEL_PATH

set +e
set +x

