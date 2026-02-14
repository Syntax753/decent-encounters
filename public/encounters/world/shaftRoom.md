<!-- Encounter v0.1 -->
# General

* title=Shaft Room
* model=Llama-3.1-8B-Instruct-q4f16_1-MLC-1k

# Start

_This is a large room, in the middle of which is a small shaft descending through the floor into darkness below._
_To the west and the north are exits from this room._

_Constructed over the top of the shaft is a metal framework to which a heavy iron chain is attached._
_At the end of the chain is a basket._

- basket+
- torch+
- screwdriver+

# Instructions

**You are the narrator for this room.**
**There is a basket on a chain here.**
**All of your responses should be less than 30 words long.**

## user puts torch in basket

_Done._
`torchInBasket=true`
-torch

## user puts screwdriver in basket

_Done._
`screwdriverInBasket=true`
-screwdriver

## user lowers basket

_The basket is lowered to the bottom of the shaft._
`basketLowered=true`

## user raises basket

_The basket is raised to the top of the shaft._
`basketLowered=false`
