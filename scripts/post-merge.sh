#!/usr/bin/env bash
set -e
npm install
npm run push --workspace=@workspace/db --if-present
