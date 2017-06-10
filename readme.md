To setup the dependencies required for doorboto2, ensure you cd to ./Server/ and run the following script:
sudo./setup.sh

To run the server, environment variables are needed!

Here is a small shell script that sets up said variables

    #!/bin/bash
    # script for starting doorboto2
    export CONNECT_TOKEN=<Tokenthatconnectsyoutmasterslacker> # not the real token
    export MASTER_SLACKER="https://masterslacker.herokuapp.com"
    export ARDUINO_PORT=</dev/ttyATH0> # This is what is for the yun, different in other OSes
    export MONGO_URI="mongodb://<ip_of_your_server>/<db_name>"
    export CHANNEL=<intended channel to post to>
    node doorboto2.js


"nano start.sh" in Sever this folder, add above code with your own parameters, ctrl-x to save, and "chmod +x start.sh"

To start the server run ./start.sh
