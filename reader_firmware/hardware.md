# Hardware

The Doorboto set up consist of Raspberry Pi running the Doorboto JS code which interfaces with an Arduino via USB/serial communications attached to a relay, bi-color LED indicator, and RFID reader for door access.

## Pin-out

Raspberry Pi USB port -> Arduino nano J1 (Micro USB)
Arduino nano -> SPI to RFID (ss 8 / rst 7)
Arduino nano -> pin 12 (RED LED +)
Arduino nano -> Pin 13 (green LED +)
Arduino nano -> pin 11 to relay

## BOM

Old UPS to hold up Power to the the system if power is out
5 VDC USB power Supply for the Raspberry PiRaspberry Pi
12 VDC power supply to power the door latch
Door latch: Ximi technology AT-300A-L (Marked on hardware 2016-3 No201604)
arduino compatible 5 VDC Relay
Bi-color LED Red/Green
RFID: MFRC522
Arduino: Arduino Nano
