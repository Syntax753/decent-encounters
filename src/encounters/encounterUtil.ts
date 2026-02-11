import Encounter, { LATEST_MAJOR_VERSION } from "./types/Encounter";
import { majorVersion, parseVersion } from "./versionUtil";
import { textToEncounter } from "./v0/readerUtil";
import { baseUrl } from "@/common/urlUtil";
import CharacterTrigger from "./v0/types/CharacterTrigger";
import VariableManager from "@/spielCode/VariableManager";
import { executeCode } from "@/spielCode/codeUtil";

export function findCharacterTriggerInText(responseText: string, characterTriggers: CharacterTrigger[]): CharacterTrigger | null {
  if (!characterTriggers.length) return null;
  let pos = 0;
  while (pos < responseText.length) {
    pos = responseText.indexOf('@', pos);
    if (pos === -1) break;
    const triggerCode = responseText[pos + 1];
    for (let triggerI = 0; triggerI < characterTriggers.length; ++triggerI) {
      const trigger = characterTriggers[triggerI];
      if (!trigger.isEnabled) continue;
      if (triggerCode === trigger.triggerCode) return trigger;
    }
    ++pos;
  }

  // Fallback: check for triggers that don't require an explicit code in output (state-based triggers marked with ?)
  console.log('Fallback trigger check details:');
  for (let triggerI = 0; triggerI < characterTriggers.length; ++triggerI) {
    const trigger = characterTriggers[triggerI];
    console.log(`Trigger [${triggerI}] Code=${trigger.triggerCode}: isEnabled=${trigger.isEnabled}, checkOutput=${trigger.checkOutput}, criteria="${trigger.criteria}"`);
    if (trigger.isEnabled && trigger.checkOutput) {
      console.log(`Found state-based trigger: ${trigger.triggerCode}`);
      return trigger;
    }
  }

  return null;
}

export function stripTriggerCodes(responseText: string): string {
  let pos = responseText.indexOf('@');
  if (pos === -1) return responseText; // Trivial case.

  let concat = responseText.substring(0, pos);
  while (pos < responseText.length) {
    const nextPos = responseText.indexOf('@', pos);
    if (nextPos === -1) break;
    concat += responseText.substring(pos, nextPos);
    pos = nextPos + 2;
  }
  if (pos < responseText.length) concat += responseText.substring(pos);
  return concat;
}

function _textToEncounter(text: string): Encounter {
  const version = parseVersion(text);
  const majorVersionNo = majorVersion(version); // For now, only v0 is supported.
  if (majorVersionNo !== LATEST_MAJOR_VERSION) throw Error(`Unsupported encounter version: ${version}`);
  return textToEncounter(text);
}

export async function loadEncounter(encounterUrl: string): Promise<Encounter> {
  const url = baseUrl(encounterUrl);
  const response = await fetch(url);
  if (!response.ok) throw Error(`Failed to load encounter from URL: ${encounterUrl}`);
  const text = await response.text();
  return _textToEncounter(text);
}

export function enableConditionalCharacterTriggers(characterTriggers: CharacterTrigger[], sessionVariables: VariableManager) {
  for (let i = 0; i < characterTriggers.length; ++i) {
    const trigger = characterTriggers[i];
    if (trigger.enabledCriteria === null) continue;
    executeCode(trigger.enabledCriteria, sessionVariables);
    executeCode(trigger.enabledCriteria, sessionVariables);
    trigger.isEnabled = sessionVariables.get('__result');
    if (trigger.isEnabled === undefined) {
      // Fallback: If __result is undefined, it might be because the criteria "variableName" was interpreted as an expression that evaluated to undefined
      // because the variable didn't exist, but maybe we just want to check if that variable name is truthy in a loose sense?
      // Actually, if "singing?" is passed, criteria code is "__result=singing".
      // If "singing" is not defined in variables, it evaluates to undefined.
      // But we want it to be treated as a boolean check. 
      // Wait, if it's undefined, it's falsey.
      // So isEnabled should be false.
      trigger.isEnabled = false;
    }
  }
}