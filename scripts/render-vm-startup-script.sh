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
# Render VM Startup Script
#
# This script is intended to be used in an Ubuntu 18.04 cloud VM with an NVIDIA
# Tesla GPU. It is designed to run on startup, provision the VM if necessary,
# build 3D renderers (currently only Filament), collect screenshots and create
# a PR on Github if there are any changes.
#
# NOTE: In order to use this script as a startup script in your own VM,
# uncomment the variables below and fill them in as appropriate, or else make
# sure the environment variables are set before this script is run.
##

# These values should definitely be customized:
# export GIT_USER_EMAIL=user@example.com
# export GIT_USER_NAME="User Name"
# export GITHUB_USER=example
# export GITHUB_ACCESS_TOKEN=your-github-access-token-here

# These values may not need to be customized:
export MODEL_VIEWER_REPOSITORY=https://$GITHUB_USER:$GITHUB_ACCESS_TOKEN@github.com/googlewebcomponents/model-viewer.git
export MODEL_VIEWER_CHECKOUT_DIRECTORY=$HOME/model-viewer
export MODEL_VIEWER_BASE_BRANCH=master

##
# NOTE: No need to modify below this line when configuring for deployment
##

# Clone the repo if necessary
if [ ! -d ./model-viewer ]; then
  git clone $MODEL_VIEWER_REPOSITORY $MODEL_VIEWER_CHECKOUT_DIRECTORY
fi

pushd $MODEL_VIEWER_CHECKOUT_DIRECTORY

# Update <model-viewer> repo from the origin and reset the tracked branch
git fetch origin
git add .
git reset --hard origin/$MODEL_VIEWER_BASE_BRANCH

popd

# Invoke relevant startup sub-scripts
source $MODEL_VIEWER_CHECKOUT_DIRECTORY/scripts/provision-ubuntu-xenial-vm.sh
source $MODEL_VIEWER_CHECKOUT_DIRECTORY/scripts/install-third-party-renderers.sh
source $MODEL_VIEWER_CHECKOUT_DIRECTORY/scripts/create-screenshot-update-pr.sh

sudo poweroff
