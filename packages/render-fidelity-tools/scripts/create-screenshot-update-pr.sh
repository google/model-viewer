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
# This script updates the screenshots of the third-party renderers that we are
# able to compare to <model-viewer>`. If there are any changes to the
# screenshots, the script then generates a branch and commits the screenshots to
# it. Finally, it opens a PR against the main project on Github.
#
# NOTE: This script is only intended to be run as part of automation
# infrastructure. It will probably work anywhere with the right environment
# variables set but please use it with caution!
##

if [ -z "$MODEL_VIEWER_CHECKOUT_DIRECTORY" ] || [ -z "$GIT_USER_EMAIL" ] || [ -z "$GIT_USER_NAME" ] || [ -z "$GITHUB_USER" ] || [ -z "$GITHUB_ACCESS_TOKEN" ] || [ -z "$MODEL_VIEWER_BASE_BRANCH" ]; then
  echo '🚨 Some variables needed to create screenshot update PR were not set!'
  exit 1;
fi

pushd $MODEL_VIEWER_CHECKOUT_DIRECTORY

# Take a new set of screenshots
npm run update-screenshots

FIDELITY_SCREENSHOT_PATH=$MODEL_VIEWER_CHECKOUT_DIRECTORY/test/fidelity
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

  PULL_REQUEST_BODY="**NOTE**: This PR was automatically generated. It contains updated render results from third-party renderers for use in our fidelity tests. Please remember to take the following steps when reviewing:\n\n - Review the changed images and take note of any patterns (same renderer, same model etc)\n - Review fidelity test results in the CI build and take note of any reported changes\n\nTo read more about \`<model-viewer>\` fidelity testing and learn how to update these screenshots yourself, check out [this explainer](https://github.com/google/model-viewer/blob/master/test/fidelity/README.md).\n\nPlease refer to this [startup script](https://github.com/google/model-viewer/blob/master/scripts/render-vm-startup-script.sh) for technical details related to how this PR was produced.";

  # Create the PR via Github's API
  curl --user "$GITHUB_USER:$GITHUB_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{ \"title\": \"$COMMIT_MESSAGE\", \"head\": \"$UPDATES_BRANCH\", \"base\": \"$MODEL_VIEWER_BASE_BRANCH\", \"body\": \"$PULL_REQUEST_BODY\", \"maintainer_can_modify\": true }" \
    https://api.github.com/repos/googlewebcomponents/model-viewer/pulls
fi

popd
