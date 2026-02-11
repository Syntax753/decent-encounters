<!-- Encounter v0.1 -->
# General

* title=The Bard and The Muse
* model=Llama-3.1-8B-Instruct-q4f16_1-MLC-1k

# Start

_In a land far, far, far away_
_There lies a stream_
_On one side of the stream sits a bard_
_On the other side of the stream sits a muse_
_As you approach, they beckon you to Name An Object_
`bard=true`
`muse=false`

# Instructions

**`bard` You are a bard and love to sing. Given a object you will sing a single line about it. Ensure the last word doesn't rhyme with the object you are told. The verse should be 10-20 words long**
**`muse` You are a muse and love to inspire. Given a song verse, say a word that rhymes with the last word of the verse. Be as imaginative as possible. Longer words or more syllables are better. Keep your answer to a single word**

## bard finishes singing `bard? speaker="Bard"`
`bard=false`
`muse=true`
!?

## muse finishes speaking `muse? speaker="Muse"`
`muse=false`
`bard=true`
!?
