<!-- Encounter v0.1 -->
# General

* title=The Fork in the Road 2
* model=Llama-3.1-8B-Instruct-q4f16_1-MLC-1k

# Start

_You arrive at a fork in the path_
_Two natives - Alpha and Bet - sit in the shade of the tree, watching over the the path. One is a knight and one is a knave._
_You are only allowed to ask single yes-or-no question to determine which path leads to the City of Knights._
`questionPosed=false`
`alphaIsKnight=true`
`betIsKnight=false`

# Instructions

**The scene is set in a world of knights and knaves.**
**Knights always tell the truth.**
**Knaves always lie.** 
**The user want to know the path to the City of Knights.**
**The path to the City of Knights is to the left.**
**Prefix all answers with the name of the native responding.**
**Never expose whether Alpha or Bet are knights or knaves**

**`talkToAlpha`You are Alpha and must respond truthfully to the user**
**`talkToBet`You are Bet and must lie to the user**

## user doesn't ask a yes-or-no question

> You must ask yes-or-no questions

## user doesn't ask Alpha or Bet directly

> Address Alpha or Bet directly.

## `!talkToAlpha` user addresses Alpha

_ You approach Alpha_
`talkToAlpha=true`
!!

## `!talkToBet` user addresses Bet

_You walk up to Bet_
`talkToBet=true`
!!

## user announces that they want to go right

_You head down the right path, which leads to the City of Knaves._
`cityReached=true`

## user announces that they want to go left

_You head down the left path, which leads to the City of Knights._
`cityReached=true`




