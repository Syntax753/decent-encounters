import { assertNonNullable } from "decent-portal";

import { NARRATION_PREFIX, PLAYER_PREFIX } from "@/components/chat/ChatHistory";
import TextConsoleBuffer from "@/components/textConsole/TextConsoleBuffer";
import { isServingLocally } from "@/developer/devEnvUtil";
import { enableConditionalCharacterTriggers, findCharacterTriggerInText, stripTriggerCodes } from "@/encounters/encounterUtil";
import Encounter from "@/encounters/types/Encounter";
import Action, { MessageAction } from "@/encounters/v0/types/Action";
import ActionType from "@/encounters/v0/types/ActionType";
import { addAssistantMessage, addUserMessage, clearChatHistory, generate, isLlmConnected, setSystemMessage } from "@/llm/llmUtil";
import { executeCode } from "@/spielCode/codeUtil";
import VariableManager, { VariableCollection } from "@/spielCode/VariableManager";

// TODO - at some point, refactor the encounter-specific logic into encounterUtil or a different module that is uncoupled to input, display, and LLM.

export const GENERATING = '...';
const MAX_LINE_COUNT = 100;

let theChatBuffer: TextConsoleBuffer | null = null;
let theEncounter: Encounter | null = null;
let theSessionVariables: VariableManager | null = null;

function _isLastLineGenerating(): boolean {
  assertNonNullable(theChatBuffer);
  if (!theChatBuffer.lines.length) return false;
  const lastLine = theChatBuffer.lines[theChatBuffer.lines.length - 1].text;
  return lastLine.endsWith(GENERATING);
}

function _delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function _addChatBufferLine(line: string) {
  assertNonNullable(theChatBuffer);
  if (_isLastLineGenerating()) {
    theChatBuffer.replaceLastLine(line);
  } else {
    theChatBuffer.addLine(line);
  }
}

function _addPlayerLine(line: string) {
  assertNonNullable(theChatBuffer);
  _addChatBufferLine(`${PLAYER_PREFIX}${line}`);
}

function _addCharacterLine(line: string) {
  assertNonNullable(theChatBuffer);
  _addChatBufferLine(line);
}

function _addNarrationLine(line: string) {
  assertNonNullable(theChatBuffer);
  _addChatBufferLine(`${NARRATION_PREFIX}${line}`);
}

function _addGeneratingLine() {
  assertNonNullable(theChatBuffer);
  _addChatBufferLine(GENERATING);
}

function _onUpdateResponse(responseText: string, setLines: Function) {
  assertNonNullable(theChatBuffer);
  const displayText = stripTriggerCodes(responseText);
  _addChatBufferLine(`${displayText}${GENERATING}`);
  setLines(theChatBuffer.lines)
}

function _actionCriteriaMet(action: MessageAction): boolean {
  if (!action.criteria) return true;
  assertNonNullable(theSessionVariables);
  executeCode(action.criteria, theSessionVariables);
  return theSessionVariables.get('__result') === true;
}


type RestartType = 'NONE' | 'SAME_PROMPT' | 'LAST_RESPONSE';

function _handleActions(actions: Action[]): { systemMessage: string, restartType: RestartType } { // TODO factor out of this module. See comments at top.
  assertNonNullable(theChatBuffer);
  let systemMessage = '';
  let restartType: RestartType = 'NONE';
  for (let i = 0; i < actions.length; ++i) {
    const action = actions[i];
    switch (action.actionType) {
      case ActionType.NARRATION_MESSAGE:
        if (_actionCriteriaMet(action)) _addNarrationLine(action.message);
        break;

      case ActionType.CHARACTER_MESSAGE:
        if (!_actionCriteriaMet(action)) break;
        _addCharacterLine(action.message);
        addAssistantMessage(action.message);
        break;

      case ActionType.PLAYER_MESSAGE:
        if (!_actionCriteriaMet(action)) break;
        _addPlayerLine(action.message);
        addUserMessage(action.message);
        break;

      case ActionType.INSTRUCTION_MESSAGE:
        if (_actionCriteriaMet(action)) {
          if (systemMessage.length) systemMessage += '\n';
          systemMessage += action.message;
        }
        break;

      case ActionType.CODE:
        assertNonNullable(theSessionVariables);
        executeCode(action.code, theSessionVariables);
        break;

      case ActionType.RESTART_TURN:
        restartType = 'SAME_PROMPT';
        break; // Stop processing further actions for this turn

      case ActionType.RESTART_TURN_WITH_LAST_RESPONSE:
        restartType = 'LAST_RESPONSE';
        break; // Stop processing further actions for this turn

      default:
        throw Error('Unexpected');
    }
    if (restartType !== 'NONE') break;
  }
  return { systemMessage, restartType };
}

// Global alignment toggle (reset in init)
let _useLeftAlignment = true;



function _finalizeResponse(responseText: string): RestartType {
  assertNonNullable(theChatBuffer);
  assertNonNullable(theEncounter);
  let displayText = stripTriggerCodes(responseText);

  const characterTrigger = findCharacterTriggerInText(responseText, theEncounter.characterTriggers);
  if (characterTrigger) {
    characterTrigger.isEnabled = false; // Prevent the same trigger from firing again in the future, unless it's re-enabled by the encounter's logic.

    if (characterTrigger.speakerName) {
      displayText = `${characterTrigger.speakerName}: ${displayText}`;
    }

    // Add alignment prefix
    const prefix = _useLeftAlignment ? 'LEFT:' : 'RIGHT:';
    displayText = `${prefix}${displayText}`;
    _useLeftAlignment = !_useLeftAlignment; // Toggle for next time

    _addCharacterLine(displayText);

    const { restartType } = _handleActions(characterTrigger.actions);
    return restartType;
  } else {
    // No trigger, standard character response
    const prefix = _useLeftAlignment ? 'LEFT:' : 'RIGHT:';
    displayText = `${prefix}${displayText}`;
    _useLeftAlignment = !_useLeftAlignment;

    if (displayText.trim().length > 0) {
      _addCharacterLine(displayText);
    }
    return 'NONE';
  }
}



function _encounterToSystemMessage(encounter: Encounter): string { // TODO factor out of this module. See comments at top.
  assertNonNullable(theEncounter);
  assertNonNullable(theSessionVariables);
  enableConditionalCharacterTriggers(theEncounter.characterTriggers, theSessionVariables);
  let { systemMessage } = _handleActions(encounter.instructionActions);
  for (let i = 0; i < encounter.characterTriggers.length; ++i) {
    const { criteria, triggerCode, isEnabled, checkOutput } = encounter.characterTriggers[i];
    if (!isEnabled || checkOutput) continue; // Don't tell LLM about state-based triggers
    systemMessage += `\nIf ${criteria} then output @${triggerCode}.`;
  }
  return systemMessage;
}

function _initForEncounter(encounter: Encounter) {
  assertNonNullable(theChatBuffer);
  theChatBuffer.clear();
  theEncounter = encounter;
  theSessionVariables = new VariableManager();
  _useLeftAlignment = true;
  const systemMessage = _encounterToSystemMessage(encounter);
  setSystemMessage(systemMessage);
  clearChatHistory();
  _handleActions(encounter.startActions);
}

function _updateSystemMessageForEncounter() {
  assertNonNullable(theEncounter);
  assertNonNullable(theSessionVariables);
  const systemMessage = _encounterToSystemMessage(theEncounter);
  setSystemMessage(systemMessage);
}

export function initChat(encounter: Encounter, setLines: Function) {
  theChatBuffer = new TextConsoleBuffer(MAX_LINE_COUNT);
  _initForEncounter(encounter);
  setLines(theChatBuffer.lines);
}

export function getVariables(): VariableCollection {
  return !theSessionVariables ? {} : theSessionVariables.toCollection();
}

export function updateEncounter(encounter: Encounter, setEncounter: Function, setModalDialogName: Function, setLines: Function) {
  assertNonNullable(theChatBuffer);
  setModalDialogName(null);
  setEncounter(encounter);
  _initForEncounter(encounter);
  setLines(theChatBuffer.lines);
}

export function restartEncounter(encounter: Encounter, setLines: Function) {
  assertNonNullable(theChatBuffer);
  _initForEncounter(encounter);
  setLines(theChatBuffer.lines);
}

export async function submitPrompt(prompt: string, setLines: Function) { // TODO factor out of this module. See comments at top.
  const MAX_RESTARTS = 1000;
  assertNonNullable(theChatBuffer);
  _addPlayerLine(prompt);
  _addGeneratingLine();
  setLines(theChatBuffer.lines);

  try {
    if (!isLlmConnected()) {
      const message = isServingLocally()
        ? `LLM is not connected. You're in a dev environment where this is expected (hot reloads, canceling the LLM load). You can refresh the page to load the LLM.`
        : 'LLM is not connected. Try refreshing the page.';
      console.error(message); // TODO toast
      return;
    }

    let restartCount = 0;
    let restartType: RestartType = 'NONE';
    let currentPrompt = prompt;

    do {
      _updateSystemMessageForEncounter();
      console.log('Generating response for prompt:', currentPrompt);


      const temperature = restartType === 'LAST_RESPONSE' ? 0.2 : undefined;
      const fullResponseText = await generate(currentPrompt, (responseText: string) => _onUpdateResponse(responseText, setLines), temperature);
      console.log('Full response text:', fullResponseText);
      restartType = _finalizeResponse(fullResponseText);
      console.log('Restart type:', restartType);



      if (restartType !== 'NONE') {
        setLines(theChatBuffer.lines); // Force UI update to show aligned text BEFORE delay

        restartCount++;
        if (restartCount > MAX_RESTARTS) {
          console.error('Max restarts exceeded.');
          break;
        }

        if (restartType === 'LAST_RESPONSE') {
          currentPrompt = stripTriggerCodes(fullResponseText);
          clearChatHistory(); // User requested no history for !? commands
        }

        const strippedResponse = stripTriggerCodes(fullResponseText);
        if (strippedResponse.trim().length > 0) {
          await _delay(5000); // Wait 5 seconds before continuing the conversation
        }

        _addGeneratingLine(); // Add a new generating line for the next attempt
        setLines(theChatBuffer.lines);
      }
    } while (restartType !== 'NONE');

    setLines(theChatBuffer.lines);
  } catch (e) {
    console.error('Error while generating response.', e);
  }
}