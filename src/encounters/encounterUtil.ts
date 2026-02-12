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
    if (pos === -1) return null;

    // Sort logic removed for performance inside loop, assuming caller sorts or we just iterate.
    // Iterating all triggers to find longest matching prefix.
    let bestMatch: CharacterTrigger | null = null;
    let maxLen = 0;

    for (const trigger of characterTriggers) {
      if (!trigger.isEnabled) continue;
      // Check if responseText starts with triggerCode at pos+1
      if (responseText.startsWith(trigger.triggerCode, pos + 1)) {
        if (trigger.triggerCode.length > maxLen) {
          maxLen = trigger.triggerCode.length;
          bestMatch = trigger;
        }
      }
    }
    if (bestMatch) return bestMatch;
    ++pos;
  }
  return null;
}

export function stripTriggerCodes(responseText: string, characterTriggers?: CharacterTrigger[]): string {
  let pos = 0;
  let result = '';
  while (pos < responseText.length) {
    const nextAt = responseText.indexOf('@', pos);
    if (nextAt !== -1) console.log(`[DEBUG] stripTriggerCodes found @ at ${nextAt}, triggers:`, characterTriggers?.length);
    if (nextAt === -1) {
      result += responseText.substring(pos);
      break;
    }
    result += responseText.substring(pos, nextAt);

    // Try to find a trigger code match
    let matchedLen = 0;
    if (characterTriggers) {
      for (const trigger of characterTriggers) {
        if (responseText.startsWith(trigger.triggerCode, nextAt + 1)) {
          if (trigger.triggerCode.length > matchedLen) {
            matchedLen = trigger.triggerCode.length;
          }
        }
      }
    }

    if (matchedLen > 0) {
      pos = nextAt + 1 + matchedLen; // skip @ + code
    } else {
      // Fallback for unknown triggers (or if triggers not provided)
      // Assume single char for backward compat if triggers not provided? 
      // OR assume alphanumeric word.
      // Given existing code assumed 1 char, let's try to match a word boundary.
      // But safer to just skip 1 char if not matched, or keep the @ if not a known trigger?
      // Existing code: skips @ + 1 char. 
      // Let's replicate strict behavior: if triggers passed, strip ONLY known triggers.
      // If no triggers passed, fallback to old behavior (strip 1 char).
      if (!characterTriggers) {
        pos = nextAt + 2;
      } else {
        // Found '@' but no matching trigger. Keep '@' and continue.
        result += '@';
        pos = nextAt + 1;
      }
    }
  }
  return result;
}

function _textToEncounter(text: string): Encounter {
  const version = parseVersion(text);
  const majorVersionNo = majorVersion(version); // For now, only v0 is supported.
  if (majorVersionNo !== LATEST_MAJOR_VERSION) throw Error(`Unsupported encounter version: ${version}`);
  return textToEncounter(text);
}

import ActionType from "./v0/types/ActionType";
import { textToCode } from "@/spielCode/codeUtil";

// ...

export async function loadEncounter(encounterUrl: string): Promise<Encounter> {
  const url = baseUrl(encounterUrl);
  const response = await fetch(url);
  if (!response.ok) throw Error(`Failed to load encounter from URL: ${encounterUrl}`);
  const text = await response.text();
  const encounter = _textToEncounter(text);

  // Inject global directional triggers
  const directions = ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'];
  directions.forEach(dir => {
    encounter.characterTriggers.push({
      criteria: `user wants to go ${dir}`,
      triggerCode: `move_${dir}`,
      isEnabled: true,
      enabledCriteria: null,
      actions: [{
        actionType: ActionType.CODE,
        code: textToCode(`__intent_direction = '${dir}'`)
      }]
    });
  });

  return encounter;
}

export async function enableConditionalCharacterTriggers(characterTriggers: CharacterTrigger[], sessionVariables: VariableManager) {
  for (let i = 0; i < characterTriggers.length; ++i) {
    const trigger = characterTriggers[i];
    if (trigger.enabledCriteria === null) continue;
    executeCode(trigger.enabledCriteria, sessionVariables);
    trigger.isEnabled = sessionVariables.get('__result');
  }
}