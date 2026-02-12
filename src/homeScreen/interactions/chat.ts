import { assertNonNullable } from "decent-portal";

import { ASCII_ART_PREFIX, NARRATION_PREFIX, PLAYER_PREFIX } from "@/components/chat/ChatHistory";
import TextConsoleBuffer from "@/components/textConsole/TextConsoleBuffer";
import { isServingLocally } from "@/developer/devEnvUtil";
import { enableConditionalCharacterTriggers, findCharacterTriggerInText, stripTriggerCodes } from "@/encounters/encounterUtil";
import Encounter from "@/encounters/types/Encounter";
import Action from "@/encounters/v0/types/Action";
import ActionType from "@/encounters/v0/types/ActionType";
import { addAssistantMessage, addUserMessage, clearChatHistory, generate, isLlmConnected, setSystemMessage, getChatHistory, setChatHistory } from "@/llm/llmUtil";
import { executeCode } from "@/spielCode/codeUtil";
import VariableManager, { VariableCollection } from "@/spielCode/VariableManager";
import Code from "@/spielCode/types/Code";
import WorldManager from "@/encounters/WorldManager";
import { generateSceneArt } from "@/encounters/sceneArt";

// ... existing code ...



// Attempt to handle movement locally, bypassing LLM for speed and reliability

// TODO - at some point, refactor the encounter-specific logic into encounterUtil or a different module that is uncoupled to input, display, and LLM.

export const GENERATING = '...';
const MAX_LINE_COUNT = 100;

let theChatBuffer: TextConsoleBuffer | null = null;
let theEncounter: Encounter | null = null;
let theSessionVariables: VariableManager | null = null;
let currentLocation: string = '';
let pruneCountForPendingTransition = 0;
let theInventory: string[] = [];
let theInputHistory: string[] = [];
const allKnownItemNames: Set<string> = new Set();

function _isLastLineGenerating(): boolean {
  assertNonNullable(theChatBuffer);
  if (!theChatBuffer.lines.length) return false;
  const lastLine = theChatBuffer.lines[theChatBuffer.lines.length - 1].text;
  return lastLine.endsWith(GENERATING);
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

function _addNarrationLine(text: string) {
  assertNonNullable(theChatBuffer);
  _addChatBufferLine(`${NARRATION_PREFIX}${text}`);
}

function _addAsciiArtLine(text: string) {
  assertNonNullable(theChatBuffer);
  _addChatBufferLine(`${ASCII_ART_PREFIX}${text}`);
}

function _addGeneratingLine() {
  assertNonNullable(theChatBuffer);
  _addChatBufferLine(GENERATING);
}

function _onUpdateResponse(responseText: string, setLines: Function) {
  assertNonNullable(theChatBuffer);
  // Pass triggers to ensure we don't show partial codes during streaming
  const triggers = theEncounter ? theEncounter.characterTriggers : [];
  const displayText = stripTriggerCodes(responseText, triggers);
  _addChatBufferLine(`${displayText}${GENERATING}`);
  setLines(theChatBuffer.lines)
}

// ...
function _actionCriteriaMet(criteria: Code | null): boolean {
  if (!criteria) return true;
  assertNonNullable(theSessionVariables);
  executeCode(criteria, theSessionVariables);
  return theSessionVariables.get('__result') === true;
}

function _handleActions(actions: Action[]): { systemMessage: string, reprocess: boolean } { // TODO factor out of this module. See comments at top.
  assertNonNullable(theChatBuffer);
  let reprocess = false;
  let systemMessage = '';
  for (let i = 0; i < actions.length; ++i) {
    const action = actions[i];
    switch (action.actionType) {
      case ActionType.NARRATION_MESSAGE:
        if (_actionCriteriaMet(action.criteria)) _addNarrationLine(action.messages.nextMessage());
        break;

      case ActionType.CHARACTER_MESSAGE:
        if (_actionCriteriaMet(action.criteria)) {
          let message = action.messages.nextMessage();
          if (theEncounter.characters && theEncounter.characters.length > 0) {
            const charName = _toTitleCase(theEncounter.characters[0]);
            message = `${charName}: ${message}`;
          }
          _addCharacterLine(message);
          addAssistantMessage(message);
        }
        break;

      case ActionType.PLAYER_MESSAGE:
        if (_actionCriteriaMet(action.criteria)) {
          const message = action.messages.nextMessage();
          _addPlayerLine(message);
          addUserMessage(message);
        }
        break;

      case ActionType.INSTRUCTION_MESSAGE:
        if (_actionCriteriaMet(action.criteria)) {
          if (systemMessage.length) systemMessage += '\n';
          systemMessage += action.messages.nextMessage();
        }
        break;

      case ActionType.CODE:
        console.log('Executing code:', action.code.source);
        assertNonNullable(theSessionVariables);
        executeCode(action.code, theSessionVariables);
        console.log('Variables after execution:', theSessionVariables.toCollection());
        break;

      case ActionType.REPROCESS:
        if (_actionCriteriaMet(action.criteria)) reprocess = true;
        break;

      default:
        throw Error('Unexpected');
    }
  }
  return { systemMessage, reprocess };
}

function _finalizeResponse(responseText: string): boolean {
  assertNonNullable(theChatBuffer);
  assertNonNullable(theEncounter);
  const characterTrigger = findCharacterTriggerInText(responseText, theEncounter.characterTriggers);
  if (characterTrigger) {
    characterTrigger.isEnabled = false; // Prevent the same trigger from firing again in the future, unless it's re-enabled by the encounter's logic.
    console.log('Finalize: Trigger found', characterTrigger.triggerCode);

    // Remove the "Generating..." line (or the streamed trigger code) from the buffer
    // since we are handling this as a hidden action.
    theChatBuffer.removeLastLine();

    const { reprocess } = _handleActions(characterTrigger.actions);
    return reprocess;
  } else {
    // Replace the "Generating..." line with the final text
    theChatBuffer.removeLastLine();

    const displayText = stripTriggerCodes(responseText, theEncounter.characterTriggers);
    _addCharacterLine(displayText);
    return false;
  }
}

function _encounterToSystemMessage(encounter: Encounter): string { // TODO factor out of this module. See comments at top.
  assertNonNullable(theEncounter);
  assertNonNullable(theSessionVariables);
  enableConditionalCharacterTriggers(theEncounter.characterTriggers, theSessionVariables);
  let { systemMessage } = _handleActions(encounter.instructionActions);

  // Filter triggers to handle specificity overrides
  const activeTriggers = encounter.characterTriggers.filter(t => t.isEnabled);
  const criteriaMap = new Map<string, CharacterTrigger[]>();

  activeTriggers.forEach(t => {
    if (!criteriaMap.has(t.criteria)) criteriaMap.set(t.criteria, []);
    criteriaMap.get(t.criteria)!.push(t);
  });

  const finalTriggers: CharacterTrigger[] = [];
  criteriaMap.forEach((triggers) => {
    // If we have multiple triggers for the same text criteria:
    // Prefer those that had a condition (enabledCriteria != null) over those that didn't.
    const conditionalTriggers = triggers.filter(t => t.enabledCriteria !== null);
    if (conditionalTriggers.length > 0) {
      finalTriggers.push(...conditionalTriggers);
    } else {
      finalTriggers.push(...triggers);
    }
  });

  for (let i = 0; i < finalTriggers.length; ++i) {
    const { criteria, triggerCode } = finalTriggers[i];
    systemMessage += `\nIf the user's intent is to ${criteria} (or they type it directly) then output ONLY @${triggerCode}.`;
  }
  systemMessage += '\nOtherwise, respond based on the context.';

  if (theSessionVariables) {
    const vars = theSessionVariables.toCollection();
    if (Object.keys(vars).length > 0) {
      systemMessage += `\n\nCurrent State:\n${Object.entries(vars).map(([k, v]) => `${k}=${v}`).join('\n')}`;
    }
  }

  if (encounter.characters && encounter.characters.length > 0) {
    const charName = _toTitleCase(encounter.characters[0]);
    systemMessage += `\nStart your response with '${charName}: '.`;
  }

  return systemMessage;
}

async function _initForEncounter(encounter: Encounter, locationName: string) {
  assertNonNullable(theChatBuffer);
  theChatBuffer.clear();
  theEncounter = encounter;
  currentLocation = locationName;

  console.log(`[DEBUG] Init Encounter: '${encounter.title}' at '${locationName}'`);

  // ALWAYS clear history first to ensure no leaks from previous scene
  clearChatHistory();

  // Generate and display scene art from description
  const description = _getSceneDescription(encounter);
  await _displaySceneArt(locationName, description);

  const savedState = WorldManager.loadSceneState(locationName);
  if (savedState) {
    console.log('Restoring state for', locationName);
    theSessionVariables = new VariableManager(savedState.variables);
    console.log('[DEBUG] Restored variables:', theSessionVariables.toCollection());

    // Restore input history
    theInputHistory = savedState.inputHistory ?? [];

    // Restore history (this overwrites the empty array from clearChatHistory)
    setChatHistory(savedState.chatHistory);

    if (savedState.consoleLines) {
      theChatBuffer.setLines(savedState.consoleLines);
    }

    const systemMessage = _encounterToSystemMessage(encounter);
    setSystemMessage(systemMessage);

    const returnMessage = `[System]: You have returned to ${encounter.title}. The previous conversation here is restored. Respond as if you are in this location.`;
    _addNarrationLine(`(You return to: ${encounter.title})`);
    _displayAvailableItems();
    _displayExitDirections();
    addAssistantMessage(returnMessage);
  } else {
    console.log('Initializing fresh state for', locationName);
    theSessionVariables = new VariableManager();
    theInputHistory = [];
    const systemMessage = _encounterToSystemMessage(encounter);
    setSystemMessage(systemMessage);
    // history is already cleared above
    _handleActions(encounter.startActions);
    _displayAvailableItems();
    _displayExitDirections();
  }
  console.log(`[DEBUG] Scene State for '${locationName}':`, {
    location: locationName,
    variables: theSessionVariables?.toCollection(),
    chatHistory: getChatHistory()
  });
}

function _getSceneDescription(encounter: Encounter): string {
  const parts: string[] = [encounter.title];
  for (const action of encounter.startActions) {
    if (action.actionType === ActionType.NARRATION_MESSAGE) {
      parts.push(action.messages.nextMessage());
    }
  }
  return parts.join(' ');
}

async function _displaySceneArt(locationKey: string, description: string) {
  const artLines = await generateSceneArt(locationKey, description);
  for (const line of artLines) {
    _addAsciiArtLine(line);
  }
}

function _updateSystemMessageForEncounter() {
  assertNonNullable(theEncounter);
  assertNonNullable(theSessionVariables);
  const systemMessage = _encounterToSystemMessage(theEncounter);
  setSystemMessage(systemMessage);
}

export async function initChat(encounter: Encounter, setLines: Function) {
  theChatBuffer = new TextConsoleBuffer(MAX_LINE_COUNT);
  const startLocation = WorldManager.getStartSceneLocation(); // Using start location for init
  await _initForEncounter(encounter, startLocation);
  setLines(theChatBuffer.lines);
}

export function getVariables(): VariableCollection {
  return !theSessionVariables ? {} : theSessionVariables.toCollection();
}

export function getInputHistory(): string[] {
  return theInputHistory;
}

export function recordInput(prompt: string) {
  theInputHistory.push(prompt);
}

export async function updateEncounter(encounter: Encounter, setEncounter: Function, setModalDialogName: Function, setLines: Function, locationName: string) {
  assertNonNullable(theChatBuffer);
  setModalDialogName(null);
  setEncounter(encounter);
  await _initForEncounter(encounter, locationName);
  setLines(theChatBuffer.lines);
}

export async function restartEncounter(encounter: Encounter, setLines: Function) {
  assertNonNullable(theChatBuffer);
  await _initForEncounter(encounter, currentLocation);
  setLines(theChatBuffer.lines);
}

// Short aliases for common directions
const DIRECTION_ALIASES: { [key: string]: string } = {
  'n': 'north', 's': 'south', 'e': 'east', 'w': 'west',
  'ne': 'northeast', 'nw': 'northwest', 'se': 'southeast', 'sw': 'southwest',
  'u': 'up', 'd': 'down',
};

// Prefixes that indicate movement intent - stripped to extract the direction
const MOVE_PREFIXES = ['go ', 'walk ', 'head ', 'move ', 'climb ', 'travel ', 'run '];

function _extractDirection(prompt: string): string | null {
  const clean = prompt.trim().toLowerCase().replace(/[^a-z ]/g, '');

  // Check if the whole prompt is an alias (e.g. "n", "sw", "u")
  if (DIRECTION_ALIASES[clean]) return DIRECTION_ALIASES[clean];

  // Check if the whole prompt is a raw direction name that exists for this location
  const availableDirs = WorldManager.getDirections(currentLocation);
  if (availableDirs.includes(clean)) return clean;

  // Strip movement prefixes to extract the direction word
  for (const prefix of MOVE_PREFIXES) {
    if (clean.startsWith(prefix)) {
      const dirWord = clean.substring(prefix.length).trim();
      // Check alias
      if (DIRECTION_ALIASES[dirWord]) return DIRECTION_ALIASES[dirWord];
      // Check if it's a valid direction for this location
      if (availableDirs.includes(dirWord)) return dirWord;
    }
  }

  return null;
}

function _handleLocalMovement(prompt: string): 'success' | 'blocked' | null {
  const direction = _extractDirection(prompt);
  if (!direction) return null;

  assertNonNullable(theChatBuffer);
  _addPlayerLine(prompt); // Echo the command here since we return early

  const dest = WorldManager.getDestination(currentLocation, direction);
  if (dest) {
    _addNarrationLine(`You walk ${direction}.`);
    assertNonNullable(theSessionVariables);
    theSessionVariables.set('location', dest);
    return 'success';
  } else {
    _addNarrationLine('You can\'t go that way.');
    return 'blocked';
  }
}

function _handleLocalInventory(prompt: string): boolean {
  const cleanPrompt = prompt.trim().toLowerCase();
  if (cleanPrompt !== 'i' && cleanPrompt !== 'inventory') return false;

  assertNonNullable(theChatBuffer);
  _addPlayerLine(prompt);

  if (theInventory.length === 0) {
    _addNarrationLine('You are empty-handed.');
  } else {
    _addNarrationLine('You are carrying:');
    for (const item of theInventory) {
      _addNarrationLine(`  - ${item}`);
    }
  }
  return true;
}

function _checkForInventoryAdd() {
  if (!theSessionVariables) return;
  const item = theSessionVariables.get('__inventory_add');
  if (item && typeof item === 'string') {
    if (!theInventory.includes(item)) {
      theInventory.push(item);
      console.log('[DEBUG] Inventory add:', item, 'Inventory:', theInventory);
    }
    theSessionVariables.set('__inventory_add', null);
  }
}

const PICKUP_PATTERNS = ['get ', 'take ', 'pick up '];

function _handleLocalPickup(prompt: string): boolean {
  const cleanPrompt = prompt.trim().toLowerCase();

  let itemName: string | null = null;
  for (const pattern of PICKUP_PATTERNS) {
    if (cleanPrompt.startsWith(pattern)) {
      itemName = cleanPrompt.substring(pattern.length).trim();
      break;
    }
  }
  if (!itemName) return false;

  assertNonNullable(theChatBuffer);
  _addPlayerLine(prompt);

  // Check if item is available in this scene (via +item action or drop)
  const varName = `__item_available_${itemName}`;
  const isAvailable = theSessionVariables && theSessionVariables.get(varName) === true;
  if (!isAvailable) {
    _addNarrationLine("You don't see that here.");
    return true;
  }

  // Pick up the item
  if (!theInventory.includes(itemName)) {
    theInventory.push(itemName);
    allKnownItemNames.add(itemName);
  }
  theSessionVariables!.set(varName, false); // No longer on the ground
  _addNarrationLine(`Taken.`);
  return true;
}

function _getAvailableItemsInScene(): string[] {
  if (!theSessionVariables) return [];
  const vars = theSessionVariables.toCollection();
  const items: string[] = [];
  const prefix = '__item_available_';
  for (const key of Object.keys(vars)) {
    if (key.startsWith(prefix) && vars[key] === true) {
      const name = key.substring(prefix.length);
      items.push(name);
      allKnownItemNames.add(name);
    }
  }
  return items;
}

function _displayAvailableItems() {
  const available = _getAvailableItemsInScene();
  if (available.length > 0) {
    _addNarrationLine(`You see ${available.join(', ')} here.`);
  }
}

function _displayExitDirections() {
  const exits = WorldManager.getDirectionsWithDestinations(currentLocation);
  if (exits.length === 0) return;

  const parts = exits.map(e => {
    const dir = e.direction.charAt(0).toUpperCase() + e.direction.slice(1);
    const name = _camelToTitle(e.destination);
    return `${dir} (${name})`;
  });

  let joined: string;
  if (parts.length === 1) {
    joined = parts[0];
  } else if (parts.length === 2) {
    joined = `${parts[0]} or ${parts[1]}`;
  } else {
    joined = parts.slice(0, -1).join(', ') + ', or ' + parts[parts.length - 1];
  }

  _addNarrationLine(`You can head ${joined} from here.`);
}

function _camelToTitle(str: string): string {
  return str.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();
}

// Verb patterns: maps verbs like 'look at', 'examine', 'open', 'read' to canonical verb keys in items.json
const VERB_PATTERNS: { patterns: string[], verb: string }[] = [
  { patterns: ['look at ', 'examine ', 'inspect ', 'look ', 'x '], verb: 'look' },
  { patterns: ['open '], verb: 'open' },
  { patterns: ['read '], verb: 'read' },
];

function _handleItemVerb(prompt: string): boolean {
  const clean = prompt.trim().toLowerCase();

  for (const { patterns, verb } of VERB_PATTERNS) {
    for (const pattern of patterns) {
      if (!clean.startsWith(pattern)) continue;
      const rest = clean.substring(pattern.length).trim();
      if (rest.length === 0) continue;

      // Try to match against all known items in items.json
      const allItems = WorldManager.getAllItemNames();
      const matchedItem = allItems.find(name => rest === name || rest === `the ${name}`);
      if (!matchedItem) continue;

      assertNonNullable(theChatBuffer);
      _addPlayerLine(prompt);

      // Check if item is accessible: in inventory or available in scene
      const inInventory = theInventory.some(i => i.toLowerCase() === matchedItem);
      const onGround = theSessionVariables && theSessionVariables.get(`__item_available_${matchedItem}`) === true;

      if (!inInventory && !onGround) {
        _addNarrationLine(`You don't see any ${matchedItem} here.`);
        return true;
      }

      // Look up verb response
      const itemDef = WorldManager.getItemVerbs(matchedItem);
      if (itemDef && itemDef[verb]) {
        _addNarrationLine(itemDef[verb]);
      } else {
        _addNarrationLine(`You can't ${verb} the ${matchedItem}.`);
      }
      return true;
    }
  }
  return false;
}

const DROP_PATTERNS = ['drop ', 'put down '];

function _handleLocalDrop(prompt: string): boolean {
  const cleanPrompt = prompt.trim().toLowerCase();

  let itemName: string | null = null;
  for (const pattern of DROP_PATTERNS) {
    if (cleanPrompt.startsWith(pattern)) {
      itemName = cleanPrompt.substring(pattern.length).trim();
      break;
    }
  }
  if (!itemName) return false;

  assertNonNullable(theChatBuffer);
  _addPlayerLine(prompt);

  const idx = theInventory.findIndex(i => i.toLowerCase() === itemName);
  if (idx === -1) {
    _addNarrationLine("You don't have that.");
    return true;
  }

  // Remove from inventory
  theInventory.splice(idx, 1);

  // Make item available in current scene
  if (theSessionVariables) {
    const varName = `__item_available_${itemName}`;
    theSessionVariables.set(varName, true);
  }

  _addNarrationLine('Dropped.');
  return true;
}

const _toTitleCase = (str: string) => {
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

function _checkItemReference(prompt: string): string | null {
  // If there are characters in the scene, we relax the strict item check
  // to allow for conversation about absent items.
  if (theEncounter?.characters && theEncounter.characters.length > 0) {
    return null;
  }

  const cleanPrompt = prompt.trim().toLowerCase();

  // Also register current scene items into the global set
  for (const item of (theEncounter?.sceneItems ?? [])) {
    allKnownItemNames.add(item.toLowerCase());
  }
  for (const char of (theEncounter?.characters ?? [])) {
    allKnownItemNames.add(char.toLowerCase());
  }

  // Check ALL known items globally — not just the current scene
  for (const itemLower of allKnownItemNames) {
    if (cleanPrompt.includes(itemLower)) {
      const inInventory = theInventory.some(i => i.toLowerCase() === itemLower);
      const onGround = theSessionVariables && theSessionVariables.get(`__item_available_${itemLower}`) === true;
      const isCharacter = (theEncounter?.characters ?? []).some(c => c.toLowerCase() === itemLower);

      if (!inInventory && !onGround && !isCharacter) {
        return itemLower;
      }
    }
  }
  return null;
}

export async function submitPrompt(prompt: string, setLines: Function, onSceneChange?: (location: string) => void, setWaiting?: (waiting: boolean) => void) {
  if (!isLlmConnected()) {
    const message = isServingLocally()
      ? `LLM is not connected. You're in a dev environment where this is expected (hot reloads, canceling the LLM load). You can refresh the page to load the LLM.`
      : 'LLM is not connected. Try refreshing the page.';
    console.error(message);
    return;
  }

  if (!theChatBuffer) {
    console.warn("Chat buffer is missing. This usually happens after a hot reload in development. Please refresh the page.");
    return;
  }

  assertNonNullable(theChatBuffer);

  // Check for scene transition *before* processing new input
  if (theSessionVariables && theSessionVariables.get('location') && onSceneChange) {
    const location = theSessionVariables.get('location');

    // Save state before leaving
    if (theSessionVariables) {
      // Clear the location trigger from variables BEFORE saving, so we don't immediately trigger a move upon return.
      theSessionVariables.set('location', null);

      // Prune transition lines (response + press enter prompt) from history
      const lines = theChatBuffer.lines;
      const linesToSave = pruneCountForPendingTransition > 0
        ? lines.slice(0, Math.max(0, lines.length - pruneCountForPendingTransition))
        : lines;

      const state = {
        chatHistory: getChatHistory(),
        variables: theSessionVariables.toCollection(),
        location: currentLocation,
        consoleLines: linesToSave,
        inputHistory: theInputHistory
      };
      console.log(`[DEBUG] Leaving '${currentLocation}', saving state (pruned ${pruneCountForPendingTransition} lines):`, state);
      WorldManager.saveSceneState(currentLocation, state);
    }

    pruneCountForPendingTransition = 0; // Reset after usage

    if (setWaiting) setWaiting(false);
    onSceneChange(location);
    return;
  }

  pruneCountForPendingTransition = 0; // Reset for normal turn

  // Attempt to handle inventory command locally
  if (_handleLocalInventory(prompt)) {
    setLines(theChatBuffer.lines);
    return;
  }

  // Attempt to handle pickup command locally
  if (_handleLocalPickup(prompt)) {
    setLines(theChatBuffer.lines);
    return;
  }

  // Attempt to handle drop command locally
  if (_handleLocalDrop(prompt)) {
    setLines(theChatBuffer.lines);
    return;
  }

  // Attempt to handle item verb command (look at X, open X, read X)
  if (_handleItemVerb(prompt)) {
    setLines(theChatBuffer.lines);
    return;
  }

  // Check if prompt references an item the player doesn't have
  const missingItem = _checkItemReference(prompt);
  if (missingItem) {
    _addPlayerLine(prompt);
    _addNarrationLine("You don't have that.");
    setLines(theChatBuffer.lines);
    return;
  }

  // Attempt to handle movement locally, bypassing LLM for speed and reliability
  const localMoveResult = _handleLocalMovement(prompt);
  if (localMoveResult) {
    if (localMoveResult === 'success') {
      if (theSessionVariables && theSessionVariables.get('location') && onSceneChange) {
        _addNarrationLine('(Press Enter to continue)');
        pruneCountForPendingTransition = 3;

        if (setWaiting) setWaiting(true);
      }
    }
    setLines(theChatBuffer.lines);
    return;
  }

  _addPlayerLine(prompt);
  const preResponseLineCount = theChatBuffer.lines.length;

  let reprocessCount = 0;
  const MAX_REPROCESS_COUNT = 3;
  while (reprocessCount < MAX_REPROCESS_COUNT) {
    _addGeneratingLine();
    setLines(theChatBuffer.lines);
    _updateSystemMessageForEncounter();
    try {
      const fullResponseText = await generate(prompt, (responseText: string) => _onUpdateResponse(responseText, setLines));
      const reprocess = _finalizeResponse(fullResponseText);
      _checkForInventoryAdd();
      setLines(theChatBuffer.lines);

      if (theSessionVariables) {
        const direction = theSessionVariables.get('__intent_direction');
        if (direction) {
          theSessionVariables.set('__intent_direction', null); // Consume
          const dest = WorldManager.getDestination(currentLocation, direction);
          if (dest) {
            _addNarrationLine(`You walk ${direction}.`); // Mirroring standard behavior
            theSessionVariables.set('location', dest);
            break; // Stop processing, triggers scene change
          } else {
            _addNarrationLine('The forest is too thick to pass through.');
          }
        }
      }

      if (!reprocess) break;
    } catch (e) {
      console.error('Error while generating response.', e);
      break;
    }
    ++reprocessCount;
  }

  if (theSessionVariables && theSessionVariables.get('location') && onSceneChange) {
    pruneCountForPendingTransition = theChatBuffer.lines.length - preResponseLineCount;

    _addNarrationLine('(Press Enter to continue)');
    pruneCountForPendingTransition++;

    setLines(theChatBuffer.lines);
    if (setWaiting) setWaiting(true);
  }
}