# Doorboto (Onsite Node Server)

Doorboto is responsible for authorizing member access to a Makerspace.

This is accomplished by gathering input from an Arduino power RFID reader.

Then comparing uid of NFC band cards to cache entries in the server.

The server's cache entries are updated on a daily basis.

Authorized members are parsed from a central online database.

This database is kept up to date with the organization's CRM and payment system.

## Hardware

Doorboto's current primary target hardware is a RaspPi 3b.

It is wired to ethernet. That is connected to a modem and router that has a UPS.

It has its own UPS for power outages. (As well as the electronic door strike that the reader can trigger)

In this way Doorboto is independently network and power tolerant.

It is wired via USB to a Arduino based RFID reader.

## Operations

The Doorboto process is kept running regardless of system restart via PM2.

Doorboto's Logs are tracked via PM2.

Doorboto's private config is tracked and held with Jitploy (to be deprecated, also optional if one knows the config)
