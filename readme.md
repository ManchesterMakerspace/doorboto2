### Requisites

* our target system is a linux box, osx would probably work too
* node.js and npm: To run doorboto use versions specified in package.json. Serial library is picky
* a mongo server where your members database is managed by another program (Doorboto is read only to a key database) This mongo server could be local or remote. Either way its a good idea to use access control on the mongo server
* Webhook url to slack is intended but not required
* Dynamo connection for activity tracking is intended but not required
* Arduino IDE (on dev machine to program the reader/latch)
* Arduino rfid reader and door latch relay, firmware included in /yunDoorbotoFirmware (Sorry no schematics, the current implementation works and is reliable, but could use to be a lot less hacked together to deserve its own documentation)
* Jitploy: To continuously deploy a pre-configured doorboto, that stays up to date with the master branch

### Setup

One could use a Raspberry Pi or similar device. Note that compiling the serial library for ARM vs x86 can be challenging. In the current implementation an Ubuntu 64bit pc is use in combination with a Arduino connected using usb communicating over serial on port /dev/ttyATH0. This port may need to added to the dial out group for doorboto to have permission to use it.

To get the latest version of this repo

    git clone https://github.com/ManchesterMakerspace/doorboto2.git

To run the server, cd into the doorboto repository

    jitploy doorboto.js

For running without jitploy see /jitploy/sample.yml to get an idea of what environment variables need to be set up.

### FAQ

Why not use wifi connected Arduino or similar?
- Free desktop and free arduino nano was cheaper
Why not use a Raspberry Pi, you had a free one of those?
- SD card corrupted at the time

Copyright 2016 ~ Manchester Makerspace ~ MIT License
