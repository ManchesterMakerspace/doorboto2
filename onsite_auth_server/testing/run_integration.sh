#!/bin/bash

# Create your own env_intergration.sh with your own env vars included in ecosystem.config.js
. testing/./env_integration.sh
node build/testing/integration_test.js
