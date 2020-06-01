#!/bin/bash

# MONGODB Related
# URI's normally include username and password
export MONGO_URI="mongodb://localhost/makerAuth"

# Slack Related - Should be able to find webhooks in slack app settings
# Member's relation channel
export MR_WEBHOOK="webhook"
# Doorboto channel
export DOORBOTO_WEBHOOK="Webhook"

# Arduino Related
export ARDUINO_PORT="/dev/ttyACM0" # This should be the port in linux

# Install PM2 to run as a deamon "npm i -g pm2"
pm2 start doorboto.js # --name "doorboto" --log-date-format 
# Should check currect doorboto start to update this model 