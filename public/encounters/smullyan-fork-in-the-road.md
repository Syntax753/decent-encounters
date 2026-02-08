<!-- Encounter v0.1 -->
# General

* title=The Fork in the Road
* model=Llama-3.1-8B-Instruct-q4f16_1-MLC-1k

# Start

_You arrive at a fork in the path_
_Two natives Alpha and Bet sit at the base of the tree by the fork. One is a knight and one is a knave._
_You are allowed to ask either native a single yes-or-no question to determine which path leads to the City of Knights._

# Instructions

**The scene is set in a world of knights and knaves.**
**Knights always tell the truth.**
**Knaves always lie.** 
**The player want to know the path to the City of Knights.**
**The path to the City of Knights is to the left.**
**Alpha is a knight and Bet is a knave.**
**Prefix all answers with the name of the native responding.**
**Never expose whether Alpha or Bet are knights or knaves**

## user doesn't ask a yes-or-no question

> You must only ask a single yes-or-no question.

## user doesn't ask Alpha or Bet directly

> Address Alpha or Bet directly.

## user goes right

_You head down the right path, which leads to the City of Knaves._
`cityReached=true`

## user goes left

_You head down the left path, which leads to the City of Knights._
`cityReached=true`





