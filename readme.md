# Requisites

- Manchester Makerspace's target system is an ARM linux box
  - OSX would probably work as well. Roll your own install script
  - A x86 64 bit Debian based Distro was the dev env, and it's less finicky with Serialport
  - Windows 10 ??? not sure. Try to roll your own install script
- Node.js and NPM: To run doorboto use versions specified in package.json. Serial library is picky
- A mongo server where your members database is managed by another program.
  - This Mongo server could be local or remote. Either way remember to use access control on the mongo server.
  - Mongo Atlas has a free tier cloud instance that can be setup easily.
- Webhook URL to slack is intended but not required
- Arduino IDE or CLI (on dev machine to program the reader/latch)
- Arduino rfid reader and door latch relay, firmware included in /reader_firmware
  - See /reader_firmware/readme.md for more details

# Setup

In the current implementation an Raspberry Pi is use in combination with a Arduino nano connected using usb communicating over serial on port /dev/ttyATH0. This port may need to added to the dial out group on the PI for doorboto to have permission to use it.

To get the latest version of this repo

    git clone https://github.com/ManchesterMakerspace/doorboto2.git

Take a look at install.sh and see if it's suitable to run in your environment.

If it is suitable it should be possible to install all dependencies from scratch by running.

    npm run install

Create an executable script called prod.sh exporting the required env vars in ecosystem.config.js.

Run the following

    npm start

## Updates

5/1/2020 - Hardware Note: we are currently using a raspberry pi instead of a dedicated desktop PC but it is using a usb drive instead of an SD.

12/2/2020 - Onsite auth server refactor deploy to use Node 14.x, Mongo Driver 3.6.x, and Serialport 9.x

- serialport compatibility took some doing with setting the correct bindings for ARM.

## License

Copyright 2016-2020 ~ Manchester Makerspace ~ MIT License
