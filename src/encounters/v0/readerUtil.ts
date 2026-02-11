import { assert } from "decent-portal";

import { parseNameValueLines, parseSections } from "../markdownUtil";
import Encounter from "./types/Encounter";
import Action, { CodeAction } from "./types/Action";
import ActionType from "./types/ActionType";
import CharacterTrigger from "./types/CharacterTrigger";
import { parseVersion } from "../versionUtil";
import { textToCode } from "@/spielCode/codeUtil";
import Code from "@/spielCode/types/Code";

function _stripEnclosers(text: string, enclosingText: string): string {
  text = text.trim();
  assert(text.startsWith(enclosingText));
  return text.endsWith(enclosingText)
    ? text.substring(enclosingText.length, text.length - enclosingText.length).trim()
    : text.substring(enclosingText.length).trim();
}

function _parseConditionalCodeBlock(line: string): { message: string, criteria: Code | null, checkOutput: boolean, speakerName: string | undefined } {
  const startPos = line.indexOf('`');
  if (startPos === -1) return { message: line, criteria: null, checkOutput: false, speakerName: undefined };
  const endPos = line.indexOf('`', startPos + 1);
  if (endPos === -1) return { message: line, criteria: null, checkOutput: false, speakerName: undefined };
  if (line.indexOf('`', endPos + 1) !== -1) throw Error('Multiple code blocks found in message line - only one allowed.');

  let inlineCode = line.substring(startPos + 1, endPos);
  let checkOutput = false;
  let speakerName: string | undefined = undefined;

  // Check for speaker="Name"
  const speakerMatch = inlineCode.match(/speaker="([^"]+)"/);
  if (speakerMatch) {
    speakerName = speakerMatch[1];
    inlineCode = inlineCode.replace(speakerMatch[0], '').trim();
  }

  if (inlineCode.endsWith('?')) {
    checkOutput = true;
    inlineCode = inlineCode.substring(0, inlineCode.length - 1);
  }

  const codeText = `__result=${inlineCode}`; // "__result=" - converts the concise expression format to a statement.
  const message = `${line.substring(0, startPos - 1)}${line.substring(endPos + 1)}`.trim();
  const criteria = textToCode(codeText);
  return { message, criteria, checkOutput, speakerName };
}

function _parseMessageAction(line: string, encloser: string, actionType: ActionType): Action {
  line = _stripEnclosers(line, encloser);
  const { message, criteria } = _parseConditionalCodeBlock(line);
  return { actionType, message, criteria } as Action;
}

function _parseCodeAction(line: string): CodeAction {
  line = _stripEnclosers(line, '`');
  const code = textToCode(line);
  return { actionType: ActionType.CODE, code };
}

function _lineToAction(line: string): Action | null {
  if (line.startsWith('**')) return _parseMessageAction(line, '**', ActionType.INSTRUCTION_MESSAGE);
  if (line.startsWith('_')) return _parseMessageAction(line, '_', ActionType.NARRATION_MESSAGE);
  if (line.startsWith('>>')) return _parseMessageAction(line, '>>', ActionType.PLAYER_MESSAGE);
  if (line.startsWith('>')) return _parseMessageAction(line, '>', ActionType.CHARACTER_MESSAGE);
  if (line.startsWith('`')) return _parseCodeAction(line);
  if (line.startsWith('!!')) return { actionType: ActionType.RESTART_TURN };
  if (line.startsWith('!?')) return { actionType: ActionType.RESTART_TURN_WITH_LAST_RESPONSE };
  return null;
}

function _parseActions(sectionContent: string): Action[] {
  const actions: Action[] = [];
  const lines = sectionContent.split('\n');
  for (let lineI = 0; lineI < lines.length; ++lineI) {
    const line = lines[lineI];
    if (line.startsWith('#')) break; // Can only be subsections from here on.
    const action = _lineToAction(line);
    if (action) actions.push(action);
  }
  return actions;
}

function _parseStartSection(startSection?: string): Action[] {
  if (!startSection) return [];
  return _parseActions(startSection);
}

function _parseTriggerSectionName(triggerSectionName: string): { criteria: string, enabledCriteria: Code | null, checkOutput: boolean, speakerName: string | undefined } {
  const { message, criteria, checkOutput, speakerName } = _parseConditionalCodeBlock(triggerSectionName);
  return { criteria: message, enabledCriteria: criteria, checkOutput, speakerName };
}

function _parseTriggerSection(triggerSectionName: string, triggerCode: string, triggerSection: string): CharacterTrigger {
  const actions = _parseActions(triggerSection);
  const { criteria, enabledCriteria, checkOutput, speakerName } = _parseTriggerSectionName(triggerSectionName);

  return {
    criteria,
    triggerCode,
    actions,
    isEnabled: true,
    enabledCriteria,
    checkOutput,
    speakerName
  }
}

function _parseInstructionSection(instructionSection?: string): [Action[], CharacterTrigger[]] {
  if (!instructionSection) return [[], []];
  const actions = _parseActions(instructionSection);
  const triggerSections = parseSections(instructionSection, 2);
  const triggerConditions = Object.keys(triggerSections);
  const triggers = triggerConditions.map((triggerSectionName, triggerNo) => {
    const triggerCode = `${triggerNo}`;
    return _parseTriggerSection(triggerSectionName, triggerCode, triggerSections[triggerSectionName])
  });
  return [actions, triggers];
}

export function textToEncounter(text: string): Encounter {
  const version = parseVersion(text); // Throws if missing/invalid.
  const sections = parseSections(text);

  const generalSettings = sections.General ? parseNameValueLines(sections.General) : {}
  const title = generalSettings.title || 'Untitled Encounter';
  const model = generalSettings.model || 'default';

  const startActions = _parseStartSection(sections.Start);
  const [instructionActions, characterTriggers] = _parseInstructionSection(sections.Instructions);

  return {
    version, title, model, startActions, instructionActions, characterTriggers, sourceText: text
  };
}