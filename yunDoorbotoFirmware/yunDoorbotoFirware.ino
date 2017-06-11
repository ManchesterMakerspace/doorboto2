// yunDoorbotoFirmware.ino ~ Copyright 2017  Manchester Makerspace ~ License MIT
// This sketch just bust out card ids to Yun when they are scanned

#include <SPI.h>      // local arduino library
#include <MFRC522.h>  // https://github.com/miguelbalboa/rfid

#define OPEN_TIME 3000
#define RELAY     11
#define RED_LED   12
#define GREEN_LED 13
#define SS_PIN    8
#define RST_PIN   7
#define INTERFACE Serial1 // quickly switch between Serial and Serial1 for testing purposes
#define BUFFER_SIZE 32    // buffer for serial recieve and get UID

MFRC522 cardReader = MFRC522(SS_PIN, RST_PIN);

const char hexmap[] = {'0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'};

void setup(){
  INTERFACE.begin(9600);      // open communication
  while(!INTERFACE){;}
  SPI.begin();                // Init SPI bus to communicate with card reader
  cardReader.PCD_Init();      // Init MFRC522 / start up card reader
  pinMode(RED_LED, OUTPUT);   // use LED
  pinMode(GREEN_LED, OUTPUT); // use LED
  pinMode(RELAY, OUTPUT);     // make relay pin an output
}

void loop(){
  getCardId();
  while(INTERFACE.available()){INTERFACE.read();} // make sure serial buffer is clear
}

void getCardId(){
  if(cardReader.PICC_IsNewCardPresent() && cardReader.PICC_ReadCardSerial()){
    INTERFACE.println(getRequestUID());      // send UID to relay
    char* response = blockingRecieve();      // wait for a response from server
    if(strcmp(response, "a") == 0){          // a is for acceptance
      digitalWrite(RELAY, HIGH);             // open relay, so member can come in
      blink(GREEN_LED, 10, 50);              // blink green led to show success
      digitalWrite(GREEN_LED, HIGH);         // hold green led on
    } else if (strcmp(response, "d") == 0){  // d is for denial
      blink(RED_LED, 15, 200);               // indicate failure w/ red led blink
      digitalWrite(RED_LED, HIGH);
    }
    delay(OPEN_TIME);                        // wait amount of time relay needs to be open or to hold off a would be atacker
    digitalWrite(RELAY, LOW);                // stop sending current to relay
    digitalWrite(GREEN_LED, LOW);            // make sure green is off
    digitalWrite(RED_LED, LOW);              // make sure red is off
  }
}


char* getRequestUID(){ // Getting the ASCII representation of card's hex UID.
  static char buffer[BUFFER_SIZE];

  byte index = 0;       // start a zero every time
  for(int i=0; i<cardReader.uid.size; ++i){
    buffer[index] = hexmap[(cardReader.uid.uidByte[i] & 0xF0) >> 4];
    index++;
    buffer[index] = hexmap[cardReader.uid.uidByte[i] & 0x0F];
    index++;
    cardReader.uid.uidByte[i] = 0;  // remove last (this) uid
  }
  cardReader.uid.size = 0;          // make sure this is read only once
  buffer[index] = "\0";             // terminate char array!
  return buffer;
}

void blink(byte led, int amount, int durration){
  static boolean toggle = false;

  toggle = ! toggle;                         // toggle LED state
  digitalWrite(led, toggle);                 // write LED state
  delay(durration);                          // block for a bit
  amount--;                                  // decrement blinks
  if(amount){blink(led, amount, durration);} // base case is no more blinks left
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

  if(INTERFACE.available()) {         // is there anything to be read
    char readChar = INTERFACE.read(); // yes? read it
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
