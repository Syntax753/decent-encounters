import Action from "./Action"
import CharacterTrigger from "./CharacterTrigger"

type EncounterV0 = {
  version:string,
  title:string,
  model:string,
  startActions:Action[],
  instructionActions:Action[],
  characterTriggers:CharacterTrigger[],
  sourceText?:string
}

export default EncounterV0;