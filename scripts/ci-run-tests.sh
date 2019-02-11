#!/bin/bash

if [ "${TRAVIS_EVENT_TYPE}" = "cron" ]; then
  echo "This is a cron build; skipping tests...";
  exit 0;
fi

npm run test

if [ "${TRAVIS_PULL_REQUEST}" = "false" ]; then
  ./scripts/run-sauce-tests.sh;
fi
