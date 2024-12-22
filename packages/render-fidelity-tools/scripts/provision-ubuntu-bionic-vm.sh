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
# Provision an Ubuntu 18.04 VM for performing automated tasks on behalf of the
# <model-viewer> project. VM is assumed to have an attached NVIDIA GPU. This
# script doesn't guarantee idempotency, but it *should* be safe to run multiple
# times.
##

if [ -z "$MODEL_VIEWER_CHECKOUT_DIRECTORY" ]; then
  MODEL_VIEWER_CHECKOUT_DIRECTORY=`pwd`
fi

# Set the DISPLAY so that headless windows launch correctly
export DISPLAY=:0

# Set up build toolchain apt repos
sudo -E apt-add-repository -y "ppa:ubuntu-toolchain-r/test"
wget -O - https://apt.llvm.org/llvm-snapshot.gpg.key|sudo apt-key add -
echo "deb http://apt.llvm.org/xenial/ llvm-toolchain-xenial-7 main" | sudo tee -a /etc/apt/sources.list >/dev/null

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
sudo apt-get install -y \
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
  libxi-dev

# Start X.org as a daemon
sudo /sbin/start-stop-daemon --start --quiet --pidfile /tmp/custom_xvfb_99.pid --make-pidfile --background --exec /usr/bin/X -- :0
sleep 3 # Give X.org a few seconds to start up...

# Set up NVM and Node.js/NPM
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install --lts

pushd $MODEL_VIEWER_CHECKOUT_DIRECTORY

# Install NPM dependencies
npm install

popd
