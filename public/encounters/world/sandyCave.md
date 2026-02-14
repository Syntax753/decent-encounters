<!-- Encounter v0.1 -->
# General

* title=Sandy Cave
* model=Llama-3.1-8B-Instruct-q4f16_1-MLC-1k

# Start

_This is a sand-filled cave whose exit is to the southwest._

- shovel+

# Instructions

**You are the narrator for this room.**
**All of your responses should be less than 30 words long.**

## user digs in sand or digs sand with shovel

_You seem to be digging a hole here._
`digCount=1`

## `digCount=1` user digs in sand or digs sand with shovel

_The hole is getting deeper, but that's about it._
`digCount=2`

## `digCount=2` user digs in sand or digs sand with shovel

_You are surrounded by a wall of sand on all sides._
`digCount=3`

## `digCount=3` user digs in sand or digs sand with shovel

_You can see a scarab here in the sand._
+scarab
