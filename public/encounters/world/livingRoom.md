<!-- Encounter v0.1 -->
# General

* title=Living Room
* model=Llama-3.1-8B-Instruct-q4f16_1-MLC-1k

# Start

_You are in the living room. There is a doorway to the east, a wooden door with strange gothic lettering to the west, which appears to be nailed shut, a trophy case, and a large oriental rug in the center of the room._
_Above the trophy case hangs an elvish sword of great antiquity._
_A battery-powered brass lantern is on the trophy case._

- sword+
- lamp+

# Instructions

**You are the narrator for this room.**
**There is a trophy case here for storing treasures.**
**All of your responses should be less than 30 words long.**

## user wants to take sword

_Taken. The elvish sword gleams faintly._
+sword

## user wants to take lamp or lantern

_Taken. The brass lantern feels sturdy in your hands._
+lamp

## `!rugMoved` user wants to move rug

_With a great effort, the rug is moved to one side of the room, revealing the dusty cover of a closed trap door._
`rugMoved=true`

## `rugMoved` `!trapDoorOpen` user wants to open trap door

_The door reluctantly opens to reveal a rickety staircase descending into darkness. ^down:cellar_
`trapDoorOpen=true`

## `trapDoorOpen` user wants to open trap door

> The trap door is already open.

## user wants to open case or trophy case

> The trophy case is open and ready for treasures.

## user wants to put something in case or trophy case

> Done. Your collection grows.

