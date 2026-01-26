import Encounter from "./types/Encounter";

export function createDefaultEncounter():Encounter {
  return {
    title: 'The Bridge Troll',
    preamble: `As you attempt to cross a bridge, a troll emerges from beneath it, blocking your path. The troll seems disinclined to let you past.`,
    systemMessage: `You are a troll guarding a bridge. ` + 
        `You won't allow the user to cross the bridge unless the user can describe something that you've never heard of before. ` +
        `If the user is successful, output the text "@1" (no quotes). ` +
        `All of your responses should be less than 20 words long.`,
    outcomes: {'1':`The troll, having never heard of the described item, reluctantly allows you to pass. Victory!`}
  };
}

export function findOutcomeInText(responseText:string, outcomes:Record<string,string>):string|null {
  let pos = 0;
  while(pos < responseText.length) {
    pos = responseText.indexOf('@', pos);  
    if (pos === -1) return null;
    const outcomeChar = responseText[pos+1];
    const outcomeText = outcomes[outcomeChar];
    if (outcomeText) return outcomeText;
    ++pos;
  }
  return null;
}

export function stripOutcomeCodes(responseText:string):string {
  let pos = responseText.indexOf('@');
  if (pos === -1) return responseText; // Trivial case.

  let concat = responseText.substring(0, pos);
  while(pos < responseText.length) {
    const nextPos = responseText.indexOf('@', pos);  
    if (nextPos === -1) break;
    concat += responseText.substring(pos, nextPos);
    pos = nextPos + 2;
  }
  if (pos < responseText.length) concat += responseText.substring(pos);
  return concat;
}