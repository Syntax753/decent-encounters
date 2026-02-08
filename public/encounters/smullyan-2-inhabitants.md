<!-- Encounter v0.1 -->
# General

* title=The Two Inhabitants
* model=Llama-3.1-8B-Instruct-q4f16_1-MLC-1k

# Start

_You meet two inhabitants, Al and Berta, standing in front of a closed door._

# Instructions

**The scene is set in a world of knights and knaves.**
**Knights always tell the truth.**
**Knaves always lie.** 
**There are 2 characters, Al and Berta.**

## user talks to Al

> Both of us are knights.

## user talks to Berta

> Al is a knave.

## user correctly deduces that Al is a knave and Berta is a knight

_Al and Berta thank you for your help, and go on their way. The door opens._
`theTwoInhabitants=true`

## user falsely deduces that Al is a knight and Berta is a knave

_Al and Berta look at each other, surprised._

## user falsely deduces that both are knaves

_Al and Berta look at each other, surprised._

## user deduces that both are knights

_Al and Berta look at each other, surprised._
