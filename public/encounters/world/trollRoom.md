<!-- Encounter v0.1 -->
# General

* title=The Troll Room
* model=Llama-3.1-8B-Instruct-q4f16_1-MLC-1k

# Start

_This is a small room with passages to the east and south and a forbidding hole leading west._
_Bloodstains and deep scratches (perhaps made by an axe) mar the walls._
_A nasty-looking Troll, brandishing a bloody axe, blocks all passages out of the room._

- axe+

# Instructions

**`!trollDead` You are a Troll. You are nasty and brandish a bloody axe.**
**`!trollDead` You block all passages out of the room.**
**`!trollDead` You are not very smart but very strong.**
**`trollDead` You are a dead Troll.**
**All of your responses should be less than 20 words long.**

## `!trollDead` user kills troll or attacks troll with sword

_The Troll is knocked out!_
_The unarmed Troll cannot defend himself: He dies._
_Almost as soon as the Troll breathes his last breath, a cloud of sinister black fog envelops him, and when the fog lifts, the carcass has disappeared._
`trollDead=true`

## `!trollDead` user goes anywhere or leaves

_The Troll fends you off with a menacing wave of his axe._
