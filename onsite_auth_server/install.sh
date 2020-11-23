#!/bin/bash

# https://github.com/nebrius/raspi-io/wiki/Getting-a-Raspberry-Pi-ready-for-NodeBots

# NVM needs to be removed Servial port requires installing as non-root but running as root
# This is done by commenting out the lines that start nvm in .profile or .bash_profile
# Then restarting the terminal session

# Get Node 14.x from nodesource
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get install -y nodejs

# I think the folowing is needed for hardware serial but it might be something to try for usb serial
# raspi-config -> Interfacing Options -> Serial -> #1 No #2 Yes
