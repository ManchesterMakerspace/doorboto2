# Hardware

The Doorboto set up consist of an Arduino attached to a relay bi-color indicator LED and RFID

The Arduino attaches to a computer/Raspi that is running the Doorboto code and interfaces with the arduino via Serial communication.

## Pinout

Arduino nano -> SPI to RFID  (ss 8 / rst 7)
Arduino nano -> pin 12 and 13 to red green LED (respectively)
Arduino nano -> pin 11 to (normally open?) relay

## BOM

Door latch: Ximi technology AT-300A-L (Marked on hardware 2016-3 No201604)
Relay: ?
LED: ?
RFID: MFRC522
Arduino: Arduino Nano
