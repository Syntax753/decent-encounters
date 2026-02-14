<!-- Encounter v0.1 -->
# General

* title=End of Rainbow
* model=Llama-3.1-8B-Instruct-q4f16_1-MLC-1k

# Start

_You are on a small, rocky beach on the continuation of the Frigid River past the Falls._
_The beach is narrow due to the presence of the White Cliffs._
_The river canyon opens here and sunlight shines in from above._
_A rainbow crosses over the falls to the east and a narrow path continues to the southwest._

- sceptre+
- potOfGold+

# Instructions

**You are the narrator for this room.**
**There is a rainbow here crossing the falls.**
**All of your responses should be less than 30 words long.**

## `!rainbowSolid` user takes pot of gold

_It is at the end of the rainbow, which is not solid._

## user waves sceptre

_Suddenly, the rainbow appears to become solid and, I venture, walkable (I think the giveaway was the stairs and bannister)._
_A shimmering pot of gold appears at the end of the rainbow._
`rainbowSolid=true`
+potOfGold

## `rainbowSolid` user crosses rainbow or goes east

_You cross the rainbow._
^east:aragainFalls
