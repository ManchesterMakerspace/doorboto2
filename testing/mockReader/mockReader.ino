// mockReader.ino ~ Copyright 2018 Manchester Makerspace ~ License MIT
// Tool for simulating check-ins without reader hardware
// Server gives a signal with a timeout durration to sleep, arduino wakes system with a key press on durration lapse
#include <JS_Timer.h>                   // library from - https://github.com/paulbeaudet/JS_Timer

#define LEFTBUTTON 9
#define RIGHTBUTTON 10
#define BOUNCETIME 5
#define HOLDSTATE 300

JS_Timer timer = JS_Timer(); // create an instance of our timer object from timer library

void setup() {
  Serial.begin(9600);        // comunicate with server
  byte buttonArray[]= {LEFTBUTTON, RIGHTBUTTON};
  for(byte whichPin=0; whichPin < sizeof(buttonArray); whichPin++){
      pinMode(buttonArray[whichPin], INPUT_PULLUP);
  }
  pinMode(LED_BUILTIN, OUTPUT);   // set up LED on pin 13
  digitalWrite(LED_BUILTIN, LOW); // turn the LED off by making the voltage LOW
}

void loop() {
  timer.todoChecker();                     // Runs continually to see if timer callback needs to be executed

  static bool leftPressed = false;             // only gets set first interation of loop
  byte leftButtonPress = leftPressEvent(); // get debounced state
  if(leftButtonPress){                     // logic to prevent continually actuating event while button is pressed
    if(!leftPressed){                          // AKA yet to be pressed
      Serial.println("test");            // send "test" card id
      leftPressed = true;
    }
  } else {leftPressed = false;} // wait until button is done being pressed before actuating event again

  static bool rightPressed = false;         // only gets set first interation of loop
  byte rightButtonPress = rightPressEvent();// get debounced state
  if(rightButtonPress){                     // logic to prevent continually actuating event while button is pressed
    if(!rightPressed){                      // AKA yet to be pressed
      Serial.println("reject");             // send "reject" card id
      rightPressed = true;
    }
  } else {rightPressed = false;} // wait until button is done being pressed before actuating event again

  char* response = receive();
  if(strcmp(response, "a") == 0){            // a is for acceptance
    longBlink();                           // give a solid blink
  } else if (strcmp(response, "d") == 0){  // d is for denial
    rapidBlink();                          // blink rapidly to show denial
  }
}

//======================= Functions =========================

void turnOffLed(){
  digitalWrite(LED_BUILTIN, LOW);
}

void longBlink(){
  digitalWrite(LED_BUILTIN, HIGH);
  timer.setTimeout(turnOffLed, 2000);
}

#define BLINK_AMOUNT 20

void rapidBlink(){
  static boolean state = false;
  static byte times = 0;

  times += 1;     // increment times
  state = !state; // toggle state

  if(times <= BLINK_AMOUNT){
    digitalWrite(LED_BUILTIN, state);
    timer.setTimeout(rapidBlink, 100);
  } else { // reset to initial case to start over again
    state = true;
    times = 0;
    turnOffLed();
  }
}

//======================== Serial Data Transfer (INTERFACE)
#define START_MARKER '<'
#define END_MARKER '>'
#define BUFFER_SIZE 12

char* receive(){
  static char buffer[BUFFER_SIZE];   // static buffer to point to
  static boolean inProgress = false; // note if read started
  static byte index = 0;             // note what is being read

  if(Serial.available()) {           // is there anything to be read
    char readChar = Serial.read();   // yes? read it
    if(inProgress){                  // did we read start maker?
      if(readChar == END_MARKER){    // did we read end marker
        buffer[index] = '\0';        // --terminate the string
        inProgress = false;          // --note finished
        index = 0;                   // --reset index
        return buffer;               // --return pointer to buffer
      } else {                       // given still in progress
        buffer[index] = readChar;    // concat this char
        index++;                     // increment index
        if(index >= BUFFER_SIZE){index = BUFFER_SIZE - 1;}  // prevent overflow by overwriting last char
      }
    } else if(readChar == START_MARKER){inProgress = true;} // indicate when to read when start marker is seen
  }
  return 0; // in the case the message has yet to be received
}

// checks for a debounced button press event // TODO needs to be modified to handle more than one button
byte rightPressEvent() {     // remove default value to use in main sketch
  static unsigned long pressTime = millis();
  static boolean timingState = false;
                                          // low is a press with the pullup
  if(digitalRead(RIGHTBUTTON) == LOW){    // if the button has been pressed
    if(timingState) {                     // given timer has started
      if(millis() - pressTime > BOUNCETIME){ // check if bounce time has elapsed
        if(millis() - pressTime > HOLDSTATE){// case button held longer return state 2
          return 2;                       // return hold state
        }
        return 1;                         // return debounced press state
      }
      return 0;                           // still in potential "bounce" window
    }
    timingState = true; // note that the timing state is set
    pressTime = millis();    // placemark when time press event started
    return 0;           // return with the timestate placeholder set
  }                     // outside of eventcases given no reading
  timingState = false;  // in case the timing state was set, unset
  return 0;             // not pressed
}
// checks for a debounced button press event // TODO needs to be modified to handle more than one button
byte leftPressEvent() {     // remove default value to use in main sketch
  static unsigned long pressTime = millis();
  static boolean timingState = false;
                                          // low is a press with the pullup
  if(digitalRead(LEFTBUTTON) == LOW){    // if the button has been pressed
    if(timingState) {                     // given timer has started
      if(millis() - pressTime > BOUNCETIME){ // check if bounce time has elapsed
        if(millis() - pressTime > HOLDSTATE){// case button held longer return state 2
          return 2;                       // return hold state
        }
        return 1;                         // return debounced press state
      }
      return 0;                           // still in potential "bounce" window
    }
    timingState = true; // note that the timing state is set
    pressTime = millis();    // placemark when time press event started
    return 0;           // return with the timestate placeholder set
  }                     // outside of eventcases given no reading
  timingState = false;  // in case the timing state was set, unset
  return 0;             // not pressed
}
