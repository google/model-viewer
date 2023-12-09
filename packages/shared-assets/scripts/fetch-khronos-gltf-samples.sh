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

# This script is responsible for cloning and / or updating the local repository
# of Khronos glTF sample models

echo '🐶 Fetching Khronos glTF sample models.
🐕 WARNING: This might result in hundreds of megabytes of data usage!'

git submodule update --init --recursive

echo '🎾 Sample models are now available'
