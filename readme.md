### Requisites

* our target system is a linux box, osx would probably work too
* node.js and npm: To run doorboto use versions specified in package.json. Serial library is picky
* a mongo server where your members database is managed by another program. This mongo server could be local or remote. Either way its a good idea to use access control on the mongo server.
* Webhook url to slack is intended but not required
* Dynamo connection for activity tracking is intended but not required
* Arduino IDE (on dev machine to program the reader/latch)
* Arduino rfid reader and door latch relay, firmware included in /yunDoorbotoFirmware (Sorry no schematics, the current implementation works and is reliable, but could use to be a lot less hacked together to deserve its own documentation)

### Setup

In the current implementation an Raspberry Pi is use in combination with a Arduino nano connected using usb communicating over serial on port /dev/ttyATH0. This port may need to added to the dial out group on the PI for doorboto to have permission to use it.

To get the latest version of this repo

    git clone https://github.com/ManchesterMakerspace/doorboto2.git

To run the server, cd into the doorboto repository

    jitploy doorboto.js

For running without jitploy see /jitploy/sample.yml to get an idea of what environment variables need to be set up.

### FAQ

50/2020 - Update: we are currently using a raspberry pi instead of a dedicated desktop PC but it is using a usb drive instead of an SD.

Copyright 2016 ~ Manchester Makerspace ~ MIT License
