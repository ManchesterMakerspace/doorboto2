#!/bin/bash

# Create your own env_intergration.sh with your own env vars included in ecosystem.config.js
. testing/./env_integration.sh
node testing/integration_test.js

# . .././prod.sh
# node ../doorboto.js