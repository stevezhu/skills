#!/bin/bash

if [ "$SKIP_POSTINSTALL" = "1" ]; then
  echo "Skipping postinstall as SKIP_POSTINSTALL is set to 1"
  exit 0
fi

node dist/cli.mjs install
