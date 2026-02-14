<!-- Encounter v0.1 -->
# General

* title=Treasure Room
* model=Llama-3.1-8B-Instruct-q4f16_1-MLC-1k

# Start

_This is a large room, whose east wall is solid granite._
_A number of discarded bags, which crumble at your touch, are scattered about on the floor._
_There is an exit down a staircase._

_There is a suspicious-looking individual, holding a large bag, leaning against one wall._
_He is armed with a deadly stiletto._
_There is a silver chalice, intricately engraved, here._

_The thief attacks, and you fall back desperately._

- chalice+
- stiletto+
- egg+
- torch+
- skull+
- bracelet+

# Instructions

**`!thiefDead` You are a Thief. You are suspicious-looking and armed with a deadly stiletto.**
**`!thiefDead` You attack adventurers.**
**`thiefDead` You are a dead Thief.**
**`!thiefVisible` You have disappeared.**
**All of your responses should be less than 20 words long.**

## `!thiefDead` `!eggGiven` user kills thief or attacks thief with knife

_You dodge as the thief comes in low._
_The thief is disarmed by a subtle feint past his guard. The robber, somewhat surprised at this turn of events, nimbly retrieves his stiletto._
_It's curtains for the thief as your nasty knife removes his head._
_Almost as soon as the thief breathes his last breath, a cloud of sinister black fog envelops him, and when the fog lifts, the carcass has disappeared._

_As the thief dies, the power of his magic decreases, and his treasures reappear:_
_A stiletto_
_A jewel-encrusted egg, with a golden clockwork canary_
_A torch_
_A crystal skull_
_A sapphire-encrusted bracelet_
`thiefDead=true`
`thiefVisible=false`
+stiletto
+egg
+torch
+skull
+bracelet

## `!thiefDead` user gives egg to thief

_The thief is taken aback by your unexpected generosity, but accepts the jewel-encrusted egg and stops to admire its beauty._
`eggGiven=true`
-egg
