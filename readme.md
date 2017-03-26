To setup the dependencies required for doorboto2, ensure you cd to ./Server/ and run the following script:
sudo./setup.sh

To run the server, environment variables are needed!

Here is a small shell script that sets up said variables

    #!/bin/bash
    # script for starting our
    # State whether testing application or not
    node doorboto2.js


"nano start.sh" in Sever this folder, add above code with your own parameters, ctrl-x to save, and "chmod +x start.sh"

To start the server run ./start.sh
