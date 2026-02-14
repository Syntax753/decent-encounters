<!-- Encounter v0.1 -->
# General

* title=Entrance to Hades
* model=Llama-3.1-8B-Instruct-q4f16_1-MLC-1k

# Start

_You are outside a large gateway, on which is inscribed_

  _Abandon every hope all ye who enter here!_

_The gate is open; through it you can see a desolation, with a pile of mangled bodies in one corner._
_Thousands of voices, lamenting some hideous fate, can be heard._
_The way through the gate is barred by evil spirits, who jeer at your attempts to pass._

- book+
- bell+
- candles+

# Instructions

**You are the narrator for this room.**
**The way through the gate is barred by evil spirits.**
**All of your responses should be less than 30 words long.**

## user rings bell

_The bell suddenly becomes red hot and falls to the ground. The wraiths, as if paralyzed, stop their jeering and slowly turn to face you. On their ashen faces, the expression of a long-forgotten terror takes shape._
`bellRung=true`
`candlesLit=false` (candles drop out)

## `bellRung` `!candlesLit` user lights candles or lights match

_The candles are lit._
_The flames flicker wildly and appear to dance. The earth beneath your feet trembles, and your legs nearly buckle beneath you. The spirits cower at your unearthly power._
`candlesLit=true`

## `bellRung` `candlesLit` `!spiritsBanished` user reads book

_Each word of the prayer reverberates through the hall in a deafening confusion. As the last word fades, a voice, loud and commanding, speaks: "Begone, fiends!" A heart-stopping scream fills the cavern, and the spirits, sensing a greater power, flee through the walls. ^south:landOfTheDead_
`spiritsBanished=true`

## `!spiritsBanished` user goes south or enters gate

_The invisible barrier holds you back._
