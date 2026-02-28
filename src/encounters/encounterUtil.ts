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
    const triggerCode = responseText[pos + 1];
    for (let triggerI = 0; triggerI < characterTriggers.length; ++triggerI) {
      const trigger = characterTriggers[triggerI];
      if (!trigger.isEnabled) continue;
      if (triggerCode === trigger.triggerCode) return trigger;
    }
    ++pos;
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

import { getEmbedding } from "@/llm/embeddingUtil";

export async function parseEncounterAsync(text: string): Promise<Encounter> {
  const version = parseVersion(text);
  const majorVersionNo = majorVersion(version); // For now, only v0 is supported.
  if (majorVersionNo !== LATEST_MAJOR_VERSION) throw Error(`Unsupported encounter version: ${version}`);
  const encounter = textToEncounter(text);

  if (encounter.winVectorText) {
    const dimensions = encounter.winVectorText.split(',').map(d => d.trim()).filter(d => d.length > 0);
    encounter.winVectors = await Promise.all(dimensions.map(d => getEmbedding(d)));
  }

  if (encounter.lossVectorText) {
    const dimensions = encounter.lossVectorText.split(',').map(d => d.trim()).filter(d => d.length > 0);
    encounter.lossVectors = await Promise.all(dimensions.map(d => getEmbedding(d)));
  }

  if (encounter.sideVectors && encounter.sideVectors.length > 0) {
    for (const sv of encounter.sideVectors) {
      if (sv.vectorText) {
        const dimensions = sv.vectorText.split(',').map(d => d.trim()).filter(d => d.length > 0);
        sv.vectors = await Promise.all(dimensions.map(d => getEmbedding(d)));
      }
    }
  }

  return encounter;
}

export async function loadEncounter(encounterUrl: string): Promise<Encounter> {
  const url = baseUrl(encounterUrl);
  const response = await fetch(url);
  if (!response.ok) throw Error(`Failed to load encounter from URL: ${encounterUrl}`);
  const text = await response.text();
  return parseEncounterAsync(text);
}

export async function enableConditionalCharacterTriggers(characterTriggers: CharacterTrigger[], sessionVariables: VariableManager) {
  for (let i = 0; i < characterTriggers.length; ++i) {
    const trigger = characterTriggers[i];
    if (trigger.enabledCriteria === null) continue;
    executeCode(trigger.enabledCriteria, sessionVariables);
    trigger.isEnabled = sessionVariables.get('__result');
  }
}

export type EncounterStub = {
  url: string;
  title: string;
};

export async function loadEncounterList(): Promise<EncounterStub[]> {
  const stubs: EncounterStub[] = [];
  const files = import.meta.glob('/public/encounters/**/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
  for (const path in files) {
    const text = await files[path]();
    const titleMatch = text.match(/^\*\s*title\s*=\s*(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : path.split('/').pop() || 'Untitled';
    const url = path.replace('/public/', '');
    stubs.push({ url, title });
  }
  stubs.sort((a, b) => a.title.localeCompare(b.title));
  return stubs;
}