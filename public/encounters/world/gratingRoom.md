<!-- Encounter v0.1 -->
# General

* title=Grating Room
* model=Llama-3.1-8B-Instruct-q4f16_1-MLC-1k

# Start

_You are in a small room near the maze. There are twisty passages in the immediate vicinity._
_Above you is a grating locked with a skull-and-crossbones lock._

# Instructions

**You are the narrator for this room.**
**There is a locked grating above.**
**All of your responses should be less than 30 words long.**

## `!grateUnlocked` user unlocks grate with skeleton key

_The grate is unlocked._
`grateUnlocked=true`

## `grateUnlocked` `!grateOpen` user opens grate

_The grating opens to reveal trees above you._
_A pile of leaves falls onto your head and to the ground. ^up:clearing_
`grateOpen=true`

## `grateOpen` user goes up

_You climb up through the grate._
