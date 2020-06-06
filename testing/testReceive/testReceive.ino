#define BUFFER_SIZE 20

void setup(){
  Serial.begin(9600);      // open communication
  // while(!INTERFACE){;}
  }

void loop(){
  // if sent "<a>" should recieve "a"
  // if sent "<work>" should recieve "work"
  Serial.println(blockingRecieve());
  while(Serial.available()){Serial.read();} // make sure serial buffer is clear
}

//======================== Serial Data Transfer (INTERFACE)
#define START_MARKER '<'
#define END_MARKER '>'

char* blockingRecieve(){
  char* response;                          // wait for a response from server
  while(!response){response = recieve();}  // block until response
  return response; // renturn pointer to recieve buffer when it is full
}

char* recieve(){
  static char buffer[BUFFER_SIZE];   // static buffer to point to
  static boolean inProgress = false; // note if read started
  static byte index = 0;             // note what is being read

  if(Serial.available()) {            // is there anything to be read
    char readChar = Serial.read();    // yes? read it
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
  return 0; // in the case the message has yet to be recieved
}
