<!-- Encounter v0.1 -->
# General

* title=Cyclops Room
* model=Llama-3.1-8B-Instruct-q4f16_1-MLC-1k

# Start

_This room has an exit on the northwest, and a staircase leading up._
_A Cyclops, who looks prepared to eat horses (much less mere adventurers), blocks the staircase._
_From his state of health, and the bloodstains on the walls, you gather that he is not very friendly, though he likes people._

# Instructions

**`!cyclopsGone` You are a Cyclops. You block the staircase.**
**`!cyclopsGone` You look prepared to eat horses.**
**There is an eastern wall here.**
**All of your responses should be less than 20 words long.**

## `!cyclopsGone` user says ulysses or odysseus

_The Cyclops, hearing the name of his father's deadly nemesis, flees the room by knocking down the wall on the east of the room. ^east:strangePassage_
`cyclopsGone=true`

## `!cyclopsGone` user goes anywhere or leaves

_The Cyclops blocks your path._

