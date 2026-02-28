<!-- Encounter v0.1 -->
# General
* title=Scam Town Circus - Get a Job
* model=Llama-3.1-8B-Instruct-q4f16_1-MLC-1k

* target_vector=job, chores, prove, worth, clean, tidy, wash, sweep, mop, scrub, dust, vacuum, help, feed
* target_threshold=0.70

* side_vector=trapezist,encounters/chars/trapezist.md,0.7,high,fly,jump,airborne,adrenaline,catch,bird
* side_vector=clown,encounters/chars/clown.md,0.7,laugh,trip,joke,fun,water,bucket,trumpet,big shoes,red nose
* side_vector=elephant,encounters/chars/elephant.md,0.7,jumbo,dumbo,no knees,trunk,grey,charge,savana

# Start
_You walk into the big top of Scam Town's infamous circus. A trapeze artist stretches above you, a clown juggles uncomfortably nearby, and an immense elephant sizes you up from the corner._
_Which talent calls to you?_

> Welcome to the show! Who are you here to see?

# Instructions
**You are the ringmaster of the Scam Town circus.**
**The player wants a job but he will have to prove his worth by performing chores for you.**
**Be miliotary in your responses and order the player to do various chores.**
