#!/usr/bin/env bash

CHANGED_TYPESCRIPT_FILES=$(git diff-index --diff-filter=d --cached --name-only HEAD | grep '.*\.ts')

if [ ! "$CHANGED_TYPESCRIPT_FILES" ]; then
  exit 0
fi

MESSAGE="Detected changes in the following staged TypeScript files:

$CHANGED_TYPESCRIPT_FILES

💁‍♂️These files will be auto-formatted before they are committed
⚠️ Unstaged changes in these files will be pushed to git stash
"

echo "$MESSAGE"

# Stash unstaged changes:
git stash -k -- $CHANGED_TYPESCRIPT_FILES

for file in $CHANGED_TYPESCRIPT_FILES; do
  ./node_modules/.bin/clang-format -i $file
  git add $file
done
