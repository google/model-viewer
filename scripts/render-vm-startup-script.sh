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

##
# Render VM Startup Script
#
# This script is intended to be used in an Ubuntu 18.04 cloud VM with an NVIDIA
# Tesla GPU. It is designed to run on startup, provision the VM if necessary,
# build 3D renderers (currently only Filament), collect screenshots and create
# a PR on Github if there are any changes.
#
# In order to use this script as a startup script in your own VM, uncomment the
# variables below and fill them in as appropriate, or else make sure the
# environment variables are set before this script is run.
##


# GIT_USER_EMAIL=user@example.com
# GIT_USER_NAME="User Name"
# GITHUB_USER=example
# GITHUB_ACCESS_TOKEN=your-github-access-token-here
# MODEL_VIEWER_REPOSITORY=https://$GITHUB_USER:$GITHUB_ACCESS_TOKEN@github.com/googlewebcomponents/model-viewer.git
# MODEL_VIEWER_BASE_BRANCH=master


# Set up build toolchain apt repos
sudo -E apt-add-repository -y "ppa:ubuntu-toolchain-r/test"
wget -O - https://apt.llvm.org/llvm-snapshot.gpg.key|sudo apt-key add -
echo "deb http://apt.llvm.org/xenial/ llvm-toolchain-xenial-7 main" | sudo tee -a ${TRAVIS_ROOT}/etc/apt/sources.list >/dev/null

# Check for CUDA and try to install NVIDIA drivers
if ! dpkg-query -W cuda-10-0; then
 curl -O http://developer.download.nvidia.com/compute/cuda/repos/ubuntu1804/x86_64/cuda-repo-ubuntu1804_10.0.130-1_amd64.deb
 sudo dpkg -i ./cuda-repo-ubuntu1804_10.0.130-1_amd64.deb
 sudo apt-key adv --fetch-keys http://developer.download.nvidia.com/compute/cuda/repos/ubuntu1604/x86_64/7fa2af80.pub
 sudo apt-get update
 sudo apt-get install cuda-10-0 -y
fi

# Enable persistence mode
sudo nvidia-smi -pm 1

# Install build chain, graphics and X.org packages
sudo apt install -y \
  xserver-xorg \
  freeglut3-dev \
  mesa-common-dev \
  mesa-utils \
  libxmu-dev \
  libglu1-mesa-dev \
  libc++-7-dev \
  libc++abi-7-dev \
  libstdc++-7-dev \
  clang-7 \
  cmake \
  ninja-build \
  libxi-dev \
  git

# Start X.org as a daemon
sudo /sbin/start-stop-daemon --start --quiet --pidfile /tmp/custom_xvfb_99.pid --make-pidfile --background --exec /usr/bin/X -- :0
sleep 3 # Give X.org a few seconds to start up...

# Export critical environment variables
export DISPLAY=:0
export CC=clang-7
export CXX=clang++-7
export FILAMENT_REQUIRES_CXXABI=true

# Set up NVM and Node.js/NPM
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install --lts


# Clone the repo if necessary
if [ ! -d ./model-viewer ]; then
  git clone $MODEL_VIEWER_REPOSITORY
fi

cd ./model-viewer

# Update the repo from the origin and reset the tracked branch
git fetch origin
git add .
git reset --hard origin/$MODEL_VIEWER_BASE_BRANCH

# If Filament is still around, delete it so that we are sure to build it
# cleanly from scratch
if [ -d /tmp/filament ]; then
  rm -rf /tmp/filament
fi

# Install NPM dependencies and update the screenshots
npm install
# NOTE: This will cause Filament to be compiled
npm run update-screenshots

FIDELITY_SCREENSHOT_PATH=./test/fidelity
NUMBER_CHANGED_SCREENSHOTS=`git ls-files -m $FIDELITY_SCREENSHOT_PATH | wc -l`

# If any screenshots changed, we will be creating a branch and crafting a PR
if [ "$NUMBER_CHANGED_SCREENSHOTS" -gt "0" ]; then
  UPDATES_BRANCH="screenshot-updates-`TZ='America/Los_Angeles' date +"%m-%d-%y"`"
  BRANCH_SHA=`git rev-parse --verify $UPDATES_BRANCH`

  # If we already ran today, we already have a branch by this name so delete it
  if [ ! -z "$BRANCH_SHA" ]; then
    git branch -d $UPDATES_BRANCH
  fi

  git checkout -b $UPDATES_BRANCH
  # Only add changes in the fidelity testing subtree
  git add $FIDELITY_SCREENSHOT_PATH

  COMMIT_MESSAGE="🤖 Render fidelity updates as of `TZ='America/Los_Angeles' date`"
  git config user.name "$GIT_USER_NAME"
  git config user.email "$GIT_USER_EMAIL"
  git commit -m "$COMMIT_MESSAGE"
  git push -f origin $UPDATES_BRANCH

  PULL_REQUEST_BODY="**NOTE**: This PR was automatically generated. It contains updated render results from third-party renderers for use in our fidelity tests. Please remember to take the following steps when reviewing:\n\n - Review the changed images and take note of any patterns (same renderer, same model etc)\n - Review fidelity test results in the CI build and take note of any reported changes\n\nTo read more about \`<model-viewer>\` fidelity testing and learn how to update these screenshots yourself, check out [this explainer](https://github.com/GoogleWebComponents/model-viewer/blob/master/test/fidelity/README.md).\n\nPlease refer to this [startup script](https://github.com/GoogleWebComponents/model-viewer/blob/master/scripts/render-vm-startup-script.sh) for technical details related to how this PR was produced.";

  # Create the PR via Github's API
  curl --user "$GITHUB_USER:$GITHUB_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{ \"title\": \"$COMMIT_MESSAGE\", \"head\": \"$UPDATES_BRANCH\", \"base\": \"$MODEL_VIEWER_BASE_BRANCH\", \"body\": \"$PULL_REQUEST_BODY\", \"maintainer_can_modify\": true }" \
    https://api.github.com/repos/googlewebcomponents/model-viewer/pulls
fi

sudo poweroff

