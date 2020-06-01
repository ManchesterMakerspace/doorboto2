#!/bin/bash
# run with ./test_reader.sh "card_id_to_approve" "ARDUINO_PORT"
APPROVED_CARD="erm"    # Probably wont approve anything
if [ "$1" ]; then
    APPROVED_CARD="$1" # Pass a known good card into this script
fi
export APPROVED_CARD

ARDUINO_PORT="/dev/ttyACM0" # This should be the port in linux
if [ "$2" ]; then
    ARDUINO_PORT="$2"       # If not pass one that works
fi
export ARDUINO_PORT

node mock_doorboto.js