<!-- Encounter v0.1 -->
# General

* title=Machine Room
* model=Llama-3.1-8B-Instruct-q4f16_1-MLC-1k

# Start

_This is a large, cold room whose sole exit is to the north. In one corner there is a machine which is reminiscent of a clothes dryer._
_On its face is a switch which is labelled "START". The switch does not appear to be manipulable by any human hand (unless the fingers are about 1/16 by 1/4 inch)._
_On the front of the machine is a large lid, which is closed._

# Instructions

**You are the narrator for this room.**
**There is a machine here with a lid and a switch.**
**All of your responses should be less than 30 words long.**

## user opens lid

_The lid opens._
`lidOpen=true`

## `lidOpen` user puts coal in machine

_Done._
`coalInMachine=true`
-coal

## user closes lid

_The lid closes._
`lidOpen=false`

## `!lidOpen` `coalInMachine` user turns switch with screwdriver

_The machine comes to life (figuratively) with a dazzling display of colored lights and bizarre noises. After a few moments, the excitement abates._
`machineDone=true`

## `machineDone` user opens lid

_The lid opens, revealing a huge diamond._
`lidOpen=true`
`machineHasDiamond=true`

## `machineHasDiamond` user takes diamond

_Taken._
+diamond

