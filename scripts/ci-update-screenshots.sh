#!/bin/bash

if [ ! "${TRAVIS_EVENT_TYPE}" = "cron" ]; then
  echo "This is not a cron build; skipping screenshot update..."
  #exit 0;
  echo "jk"
fi

glxinfo
npm run update-screenshots
