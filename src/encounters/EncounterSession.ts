import LLMMessages from "@/llm/types/LLMMessages";
import Encounter, { LATEST_MAJOR_VERSION, SceneType } from "./types/Encounter";
import VariableManager, { VariableCollection } from "@/spielCode/VariableManager";
import { majorVersion, parseVersion } from "./versionUtil";
import { textToEncounter } from "./v0/readerUtil";
import Action from "./v0/types/Action";
import { assert, assertNonNullable } from "decent-portal";
import ActionType from "./v0/types/ActionType";
import Code from "@/spielCode/types/Code";
import { executeCode } from "@/spielCode/codeUtil";
import { addAssistantMessageToChatHistory, addToolMessageToChatHistory, addUserMessageToChatHistory } from "@/llm/messageUtil";
import CharacterTrigger from "./v0/types/CharacterTrigger";
import { stripTriggerCodes } from "./encounterUtil";
import { baseUrl } from "@/common/urlUtil";
import FunctionBinding from "@/spielCode/types/FunctionBinding";

type GenerateCallback = (messages: LLMMessages) => Promise<string>;
type MessageCallback = (text: string) => void;
type EncounterLoadedCallback = (encounter: Encounter) => void;

function _textToEncounter(text: string): Encounter {
  const version = parseVersion(text);
  const majorVersionNo = majorVersion(version); // For now, only v0 is supported.
  if (majorVersionNo !== LATEST_MAJOR_VERSION) throw Error(`Unsupported encounter version: ${version}`);
  return textToEncounter(text);
}

function _criteriaMet(criteria: Code | null, variables: VariableManager, functionBindings: FunctionBinding[]): boolean {
  if (!criteria) return true;
  const prevResult = variables.get('__result');
  assertNonNullable(variables);
  executeCode(criteria, variables, functionBindings);
  const result = variables.get('__result') === true;
  variables.set('__result', prevResult); // Restoring the value avoids any variable name collisions.
  return result;
}

function _enableConditionalCharacterTriggers(characterTriggers: CharacterTrigger[], variables: VariableManager, functionBindings: FunctionBinding[]) {
  for (let i = 0; i < characterTriggers.length; ++i) {
    const trigger = characterTriggers[i];
    if (trigger.enabledCriteria === null) continue;
    trigger.isEnabled = _criteriaMet(trigger.enabledCriteria, variables, functionBindings);
  }
}

function _findCharacterTriggerInText(responseText: string, characterTriggers: CharacterTrigger[]): CharacterTrigger | null {
  if (!characterTriggers.length) return null;
  let pos = 0;
  while (pos < responseText.length) {
    pos = responseText.indexOf('@', pos);
    if (pos === -1) return null;
    const triggerCode = responseText[pos + 1]; // TODO - support for more than 10 codes. Probably use a-zA-Z0-9 from a lookup array. It is more performant to use less chars.
    for (let triggerI = 0; triggerI < characterTriggers.length; ++triggerI) {
      const trigger = characterTriggers[triggerI];
      if (!trigger.isEnabled) continue;
      if (triggerCode === trigger.triggerCode) return trigger;
    }
    ++pos;
  }
  return null;
}

function _isLowerCaseAlphaChar(char: string): boolean {
  return char >= 'a' && char <= 'z';
}

function _doesTextContainPhrase(text: string, phrases: string[]): boolean {
  const _isAtWordBoundary = (_pos: number) => !_isLowerCaseAlphaChar(text[_pos]);

  text = text.toLowerCase();
  for (let phraseI = 0; phraseI < phrases.length; ++phraseI) {
    const phrase = phrases[phraseI].toLowerCase();
    let pos = 0;
    while (pos < text.length) {
      pos = text.indexOf(phrase, pos);
      if (pos === -1) break;
      if (_isAtWordBoundary(pos - 1) && _isAtWordBoundary(pos + phrase.length)) return true;
      pos += phrase.length;
    }
  }
  return false;
}

function _defaultOnGenerate(_messages: LLMMessages): Promise<string> {
  console.warn('EncounterSession onGenerate() was not bound. Returning default response.');
  return Promise.resolve('onGenerate() was not bound.');
}

function _defaultOnCharacterMessage(text: string): void {
  console.warn('EncounterSession onCharacterMessage() was not bound. Message:', text);
}

function _defaultOnNarrationMessage(text: string): void {
  console.warn('EncounterSession onNarrationMessage() was not bound. Message:', text);
}

function _defaultOnPlayerMessage(text: string): void {
  console.warn('EncounterSession onPlayerMessage() was not bound. Message:', text);
}

class EncounterSession {
  private _encounter: Encounter | null;
  private _variables: VariableManager;
  private _onGenerate: GenerateCallback;
  private _onCharacterMessage: MessageCallback;
  private _onNarrationMessage: MessageCallback;
  private _onPlayerMessage: MessageCallback;
  private _onEncounterLoaded: EncounterLoadedCallback | null = null;
  private _llmMessages: LLMMessages;
  private _functionBindings: FunctionBinding[] = [];

  constructor(maxChatHistorySize: number = 100) {
    this._onGenerate = _defaultOnGenerate;
    this._onCharacterMessage = _defaultOnCharacterMessage;
    this._onNarrationMessage = _defaultOnNarrationMessage;
    this._onPlayerMessage = _defaultOnPlayerMessage;
    this._encounter = null;
    this._variables = new VariableManager();
    this._llmMessages = {
      chatHistory: [],
      maxChatHistorySize,
      systemMessage: null
    };
    this._functionBindings = [];
  }

  private _handleActions(actions: Action[]): { instructions: string, reprocess: boolean, wereMessagesAdded: boolean } {
    let reprocess = false;
    let instructions = '';
    let wereMessagesAdded = false;
    for (let i = 0; i < actions.length; ++i) {
      const action = actions[i];
      switch (action.actionType) {
        case ActionType.NARRATION_MESSAGE:
          if (_criteriaMet(action.criteria, this._variables, this._functionBindings)) {
            this._onNarrationMessage(action.messages.nextMessage());
            wereMessagesAdded = true;
          }
          break;

        case ActionType.CHARACTER_MESSAGE:
          if (_criteriaMet(action.criteria, this._variables, this._functionBindings)) {
            const message = action.messages.nextMessage();
            this._onCharacterMessage(message);
            addAssistantMessageToChatHistory(this._llmMessages, message);
            wereMessagesAdded = true;
          }
          break;

        case ActionType.PLAYER_MESSAGE:
          if (_criteriaMet(action.criteria, this._variables, this._functionBindings)) {
            const message = action.messages.nextMessage();
            this._onPlayerMessage(message);
            addUserMessageToChatHistory(this._llmMessages, message);
            wereMessagesAdded = true;
          }
          break;

        case ActionType.INSTRUCTION_MESSAGE:
          if (_criteriaMet(action.criteria, this._variables, this._functionBindings)) {
            if (instructions.length) instructions += '\n';
            instructions += action.messages.nextMessage();
          }
          break;

        case ActionType.CODE:
          executeCode(action.code, this._variables, this._functionBindings);
          break;

        case ActionType.REPROCESS:
          if (_criteriaMet(action.criteria, this._variables, this._functionBindings)) reprocess = true;
          break;

        default:
          throw Error('Unexpected');
      }
    }
    return { instructions, reprocess, wereMessagesAdded };
  }

  private _appendMatchingMemoriesToChatHistory(playerText: string): boolean {
    assertNonNullable(this._encounter);
    let messagesAdded = false;
    for (let i = 0; i < this._encounter.memories.length; ++i) {
      const memory = this._encounter.memories[i];
      if (!_doesTextContainPhrase(playerText, memory.matchPhrases) || !_criteriaMet(memory.enabledCriteria, this._variables, this._functionBindings)) continue;
      const { instructions, wereMessagesAdded } = this._handleActions(memory.actions);
      if (wereMessagesAdded) messagesAdded = true;
      if (!instructions.length) continue;
      const memoryMessage = `I remember this about ${memory.matchPhrases[0]}: ${instructions}\n`;
      if (this._llmMessages.chatHistory.find(m => m.content === memoryMessage)) continue; // Don't repeat memories already in context.
      addToolMessageToChatHistory(this._llmMessages, memoryMessage); // Message is added to end of chat history, so LLM has it for context, but not displayed.
    }
    return messagesAdded;
  }

  private _updateSystemMessage() { // Important: not idempotent. Variable state can change in _handleActions().
    assertNonNullable(this._encounter);
    _enableConditionalCharacterTriggers(this._encounter.characterTriggers, this._variables, this._functionBindings);
    let { instructions } = this._handleActions(this._encounter.instructionActions);
    for (let i = 0; i < this._encounter.characterTriggers.length; ++i) {
      const { criteria, triggerCode, isEnabled } = this._encounter.characterTriggers[i];
      if (!isEnabled) continue;
      instructions += `\nIf ${criteria} then output @${triggerCode} and nothing else.`;
    }
    this._llmMessages.systemMessage = instructions;
  }

  private async _generateWithResponseHandling() {
    assertNonNullable(this._encounter);
    let reprocessCount = 0;
    const MAX_REPROCESS_COUNT = 3;
    while (++reprocessCount <= MAX_REPROCESS_COUNT) {
      this._updateSystemMessage();
      const responseText = await this._onGenerate(this._llmMessages);
      const characterTrigger = _findCharacterTriggerInText(responseText, this._encounter.characterTriggers);
      if (!characterTrigger) {
        const displayText = stripTriggerCodes(responseText);
        this._onCharacterMessage(displayText);
        return;
      } else {
        characterTrigger.isEnabled = false; // Prevent the same trigger from firing again in the future, unless it's re-enabled by the encounter's logic.
        const { reprocess } = this._handleActions(characterTrigger.actions);
        if (!reprocess) break;
      }
    }
  }

  async start(encounter: Encounter) {
    this._encounter = encounter;
    this._variables = new VariableManager();
    this._variables.set('instinct', 50);
    const { reprocess } = this._handleActions(this._encounter.startActions);
    this._llmMessages.chatHistory = [];
    if (reprocess) await this._generateWithResponseHandling();
  }

  async startFromUrl(encounterUrl: string) {
    const { loadEncounter } = await import("./encounterUtil");
    const encounter = await loadEncounter(encounterUrl);
    if (this._onEncounterLoaded !== null) {
      this._onEncounterLoaded(encounter);
    } else {
      await this.start(encounter);
    }
  }

  async restart() {
    if (!this._encounter) throw Error('No encounter loaded');
    this._variables = new VariableManager();
    this._variables.set('instinct', 50);
    const { reprocess } = this._handleActions(this._encounter.startActions);
    this._llmMessages.chatHistory = [];
    if (reprocess) await this._generateWithResponseHandling();
  }

  async prompt(playerText: string) {
    if (!this._encounter) throw Error('No encounter loaded');
    addUserMessageToChatHistory(this._llmMessages, playerText);
    this._onPlayerMessage(playerText);
    const skipResponseHandling = this._appendMatchingMemoriesToChatHistory(playerText);
    if (skipResponseHandling) return;

    // Evaluate Vector DB Proximity for multiple dimensions
    if (this._encounter.sceneType !== SceneType.DEFAULT) {
      const { getEmbedding, cosineSimilarity } = await import("@/llm/embeddingUtil");
      const playerVector = await getEmbedding(playerText);

      if (this._encounter.sceneType === SceneType.WIN_LOSE) {
        // WIN_LOSE uses compound average of turn maximums
        let currentTurnMaxWin = 0;
        if (this._encounter.winVectors) {
          for (const vector of this._encounter.winVectors) {
            currentTurnMaxWin = Math.max(currentTurnMaxWin, cosineSimilarity(playerVector, vector));
          }
        }

        let currentTurnMaxLoss = 0;
        if (this._encounter.lossVectors) {
          for (const vector of this._encounter.lossVectors) {
            currentTurnMaxLoss = Math.max(currentTurnMaxLoss, cosineSimilarity(playerVector, vector));
          }
        }

        const winHistory = (this._variables.get('__winProximityTurnHistory') as number[]) || [];
        winHistory.push(currentTurnMaxWin);
        if (this._encounter.historyLimit !== null && winHistory.length > this._encounter.historyLimit) winHistory.shift();
        this._variables.set('__winProximityTurnHistory', winHistory);

        const lossHistory = (this._variables.get('__lossProximityTurnHistory') as number[]) || [];
        lossHistory.push(currentTurnMaxLoss);
        if (this._encounter.historyLimit !== null && lossHistory.length > this._encounter.historyLimit) lossHistory.shift();
        this._variables.set('__lossProximityTurnHistory', lossHistory);

        // Calculate inverse ln(x) weighted average
        let sumWeights = 0;
        let weightedWinSum = 0;
        let weightedLossSum = 0;

        let debugOutput = `\n--- Instinct Scoring Debug ---\n`;
        debugOutput += `Player Text : "${playerText}"\n`;
        debugOutput += `Win History : [${winHistory.map(w => w.toFixed(2)).join(', ')}]\n`;
        debugOutput += `Loss History: [${lossHistory.map(l => l.toFixed(2)).join(', ')}]\n`;
        debugOutput += `Weights Applied (Inverse ln(x)):\n`;

        for (let i = 0; i < winHistory.length; i++) {
          const age = winHistory.length - i; // newest is 1

          const weight = 1 / Math.log(age + 1); // inverse ln(x+1) to avoid log(1)=0

          const wWin = winHistory[i];
          const wLoss = lossHistory[i] !== undefined ? lossHistory[i] : 0;

          weightedWinSum += wWin * weight;
          weightedLossSum += wLoss * weight;
          sumWeights += weight;

          debugOutput += `  Age ${age} (Turn ${i + 1}) -> Weight: ${weight.toFixed(3)} | Win: ${wWin.toFixed(2)}, Loss: ${wLoss.toFixed(2)}\n`;
        }

        const avgWin = sumWeights > 0 ? weightedWinSum / sumWeights : 0;
        const avgLoss = sumWeights > 0 ? weightedLossSum / sumWeights : 0;

        debugOutput += `Weighted Win Avg : ${avgWin.toFixed(3)}\n`;
        debugOutput += `Weighted Loss Avg: ${avgLoss.toFixed(3)}\n`;

        // Tug-of-war logic based on the difference of the compound averages in the history window
        let winMult = 0.5;
        let lossMult = 0.5;
        if (this._encounter.weightedProximity) {
          const previousProximity = (this._variables.get('__vectorProximity') as number) ?? 0.5;
          winMult = previousProximity;
          lossMult = 1.0 - previousProximity;
        }

        let isSwitch = false;
        if (winHistory.length >= 2 && lossHistory.length >= 2) {
          const currWin = winHistory[winHistory.length - 1];
          const currLoss = lossHistory[lossHistory.length - 1];
          const prevWin = winHistory[winHistory.length - 2];
          const prevLoss = lossHistory[lossHistory.length - 2];

          if (currWin > currLoss && prevWin < prevLoss) isSwitch = true;
          if (currLoss > currWin && prevLoss < prevWin) isSwitch = true;
        }

        if (isSwitch) {
          debugOutput += `Switch Detected: win vs loss proximity changed direction!\n`;
          if (this._encounter.switchType === 'reset') {
            winMult = 0.5;
            lossMult = 0.5;
            debugOutput += `Switch Type 'reset' applied: Multipliers reset to 0.5\n`;
          } else if (this._encounter.switchType === 'reverse') {
            const temp = winMult;
            winMult = lossMult;
            lossMult = temp;
            debugOutput += `Switch Type 'reverse' applied: Multipliers swapped.\n`;
          }
        }

        let baseValue = 0.50;
        if (this._encounter.baseInstinct === 'dynamic') {
          baseValue = (this._variables.get('__vectorProximity') as number) ?? 0.5;
        }

        const currentProximity = Math.max(0, Math.min(1, baseValue + (avgWin * winMult) - (avgLoss * lossMult)));

        const instinct = Math.max(0, Math.min(100, Math.round(currentProximity * 100)));

        debugOutput += `Calculation: ${baseValue.toFixed(2)} + (${avgWin.toFixed(3)} * ${winMult.toFixed(3)}) - (${avgLoss.toFixed(3)} * ${lossMult.toFixed(3)}) = ${currentProximity.toFixed(3)}\n`;
        debugOutput += `Final Instinct Proximity: ${currentProximity.toFixed(3)}\n`;
        debugOutput += `Instinct: ${instinct}\n`;
        debugOutput += `------------------------------`;
        console.log(debugOutput);

        this._variables.set('__vectorProximity', currentProximity);
        this._variables.set('instinct', instinct);

        if (this._encounter.targetThreshold !== null && currentProximity >= this._encounter.targetThreshold) {
          this._onNarrationMessage(`That went well!...`);
          this._variables.set('__victory', true);
          return;
        }

        if (this._encounter.lossThreshold !== null && currentProximity <= this._encounter.lossThreshold) {
          this._onNarrationMessage(`You feel like you could have done better...`);
          this._variables.set('__loss', true);
          return;
        }
      } else if (this._encounter.sceneType === SceneType.WIN_ONLY) {
        // WIN_ONLY uses sum of absolute historical maximums per target
        let sumMaxWinSimilarity = 0;
        if (this._encounter.winVectors) {
          for (let i = 0; i < this._encounter.winVectors.length; ++i) {
            const targetVector = this._encounter.winVectors[i];
            const similarity = cosineSimilarity(playerVector, targetVector);

            const varName = `__winProximityHistory_${i}`;
            const history = (this._variables.get(varName) as number[]) || [];
            history.push(similarity);
            if (this._encounter.historyLimit !== null && history.length > this._encounter.historyLimit) {
              history.shift();
            }
            this._variables.set(varName, history);

            const newMax = Math.max(...history);
            sumMaxWinSimilarity += newMax;
          }
        }

        const progWinMax = this._encounter.winVectors && this._encounter.winVectors.length > 0 ? sumMaxWinSimilarity / this._encounter.winVectors.length : 0.0;
        const currentProximity = progWinMax;
        const instinct = Math.max(0, Math.min(100, Math.round(currentProximity * 100)));

        console.log(`Vector similarity overall for '${playerText}': Win=${progWinMax.toFixed(2)}, Proximity=${currentProximity.toFixed(2)}\nInstinct: ${instinct}`);
        this._variables.set('__vectorProximity', currentProximity);
        this._variables.set('instinct', instinct);

        if (this._encounter.targetThreshold !== null && currentProximity >= this._encounter.targetThreshold) {
          this._onNarrationMessage(`That went well!...`);
          this._variables.set('__victory', true);
          return;
        }
      }
    }

    if (this._encounter.sideVectors && this._encounter.sideVectors.length > 0) {
      const { getEmbedding, cosineSimilarity } = await import("@/llm/embeddingUtil");
      const playerVector = await getEmbedding(playerText);

      let debugOutput = `--- Side Vectors ---\n`;
      let redirectUrl: string | null = null;

      for (let svIdx = 0; svIdx < this._encounter.sideVectors.length; ++svIdx) {
        const sv = this._encounter.sideVectors[svIdx];
        if (!sv.vectors || sv.vectors.length === 0) continue;

        let sumMaxSimilarity = 0;
        for (let i = 0; i < sv.vectors.length; ++i) {
          const targetVector = sv.vectors[i];
          const similarity = cosineSimilarity(playerVector, targetVector);

          const varName = `__sideVectorHistory_${svIdx}_${i}`;
          const history = (this._variables.get(varName) as number[]) || [];
          history.push(similarity);
          if (this._encounter.historyLimit !== null && history.length > this._encounter.historyLimit) {
            history.shift();
          }
          this._variables.set(varName, history);

          sumMaxSimilarity += Math.max(...history);
        }

        const currentProximity = Math.max(0, Math.min(1, sumMaxSimilarity / sv.vectors.length));
        const instinct = Math.max(0, Math.min(100, Math.round(currentProximity * 100)));

        this._variables.set(`__sideVectorInstinct_${svIdx}`, instinct);
        debugOutput += `[${sv.url}] Proximity: ${currentProximity.toFixed(3)}, Instinct: ${instinct}\n`;

        if (currentProximity >= sv.threshold && redirectUrl === null) {
          debugOutput += `[${sv.url}] threshold ${sv.threshold} reached! Triggering jump.\n`;
          redirectUrl = sv.url;
        }
      }
      debugOutput += `------------------------------`;
      console.log(debugOutput);

      if (redirectUrl) {
        this.startFromUrl(redirectUrl);
        return; // Halt generating a response to the prompt if we are navigating away.
      }
    }

    await this._generateWithResponseHandling();
  }

  getVariables(): VariableCollection {
    return this._variables.toCollection();
  }

  getSystemMessage(): string {
    return this._llmMessages.systemMessage ?? 'undefined';
  }

  unbindAllFunctions() {
    this._onGenerate = _defaultOnGenerate;
    this._onCharacterMessage = _defaultOnCharacterMessage;
    this._onNarrationMessage = _defaultOnNarrationMessage;
    this._onPlayerMessage = _defaultOnPlayerMessage;
    this._functionBindings = [];
  }

  unbindFunction(functionName: string) {
    switch (functionName) {
      case 'onGenerate':
        this._onGenerate = _defaultOnGenerate;
        break;

      case 'onCharacterMessage':
        this._onCharacterMessage = _defaultOnCharacterMessage;
        break;

      case 'onNarrationMessage':
        this._onNarrationMessage = _defaultOnNarrationMessage;
        break;

      case 'onPlayerMessage':
        this._onPlayerMessage = _defaultOnPlayerMessage;
        break;

      default:
        this._functionBindings = this._functionBindings.filter(binding => binding.functionName !== functionName);
        break;
    }
  }

  bindFunction(func: Function, functionName?: string) {
    if (!functionName) functionName = func.name;
    const paramCount = func.length;
    this.unbindFunction(functionName);
    switch (functionName) {
      case 'onGenerate':
        assert(paramCount === 1);
        this._onGenerate = func as GenerateCallback;
        break;

      case 'onCharacterMessage':
        assert(paramCount === 1);
        this._onCharacterMessage = func as MessageCallback;
        break;

      case 'onNarrationMessage':
        assert(paramCount === 1);
        this._onNarrationMessage = func as MessageCallback;
        break;

      case 'onPlayerMessage':
        assert(paramCount === 1);
        this._onPlayerMessage = func as MessageCallback;
        break;

      default:
        this._functionBindings.push({ functionName, paramCount, function: func });
        break;
    }
  }

  setOnEncounterLoaded(callback: EncounterLoadedCallback) {
    this._onEncounterLoaded = callback;
  }
}

export default EncounterSession;