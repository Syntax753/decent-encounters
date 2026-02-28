import Action from "./Action";
import CharacterTrigger from "./CharacterTrigger";
import Memory from "./Memory";

export enum SceneType {
  WIN_ONLY = 'WIN_ONLY',
  WIN_LOSE = 'WIN_LOSE',
  DEFAULT = 'DEFAULT'
}

export type SideVector = {
  name: string,
  url: string,
  threshold: number,
  vectorText: string,
  vectors: number[][] | null
}

type EncounterV0 = {
  version: string,
  title: string,
  model: string,
  startActions: Action[],
  instructionActions: Action[],
  characterTriggers: CharacterTrigger[],
  memories: Memory[],
  sceneType: SceneType,
  winVectorText: string | null,
  winVectors: number[][] | null,
  lossVectorText: string | null,
  lossVectors: number[][] | null,
  targetThreshold: number | null,
  lossThreshold: number | null,
  historyLimit: number | null,
  weightedProximity: boolean,
  switchType: 'false' | 'reset' | 'reverse',
  baseInstinct: 'fixed' | 'dynamic',
  sideVectors: SideVector[],
  sourceText: string | null // For authoring use cases, source text is needed to preserve comments and formatting. For playback-only use cases, this can be null.
}

export default EncounterV0;