#define BUFFER_SIZE 20

void setup(){
  Serial.begin(9600);      // open communication
  // while(!INTERFACE){;}  // This should only matter for the atmel32u4 and like chips
  }

void loop(){
  // if sent "<a>" should receive "a"
  // if sent "<work>" should receive "work"
  Serial.println(blockingReceive());
  while(Serial.available()){Serial.read();} // make sure serial buffer is clear
}

//======================== Serial Data Transfer (INTERFACE)
#define START_MARKER '<'
#define END_MARKER '>'

char* blockingReceive(){
  char* response;                          // wait for a response from server
  while(!response){response = receive();}  // block until response
  return response; // renturn pointer to receive buffer when it is full
}

char* receive(){
  static char buffer[BUFFER_SIZE];   // static buffer to point to
  static boolean inProgress = false; // note if read started
  static byte index = 0;             // note what is being read

  if(Serial.available()) {         // is there anything to be read
    char readChar = Serial.read(); // yes? read it
    if(inProgress){                   // did we read start maker?
      if(readChar == END_MARKER){     // did we read end marker
        buffer[index] = '\0';         // --terminate the string
        inProgress = false;           // --note finished
        index = 0;                    // --reset index
        return buffer;                // --return pointer to buffer
      } else {                        // given still in progress
        buffer[index] = readChar;     // concat this char
        index++;                      // increment index
        if(index >= BUFFER_SIZE){index = BUFFER_SIZE - 1;}  // prevent overflow by overwriting last char
      }
    } else if(readChar == START_MARKER){inProgress = true;} // indicate when to read when start marker is seen
  }
  return 0; // in the case the message has yet to be received
}
