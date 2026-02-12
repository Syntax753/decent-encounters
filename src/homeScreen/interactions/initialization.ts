import { getConnectionModelId, isLlmConnected } from "@/llm/llmUtil";
import { initChat } from "./chat";
import { loadEncounter } from "@/encounters/encounterUtil";
import WrongModelDialog from "../dialogs/WrongModelDialog";
import WorldManager from "@/encounters/WorldManager";

export async function init(setEncounter: Function, setLines: Function, setModalDialogName: Function): Promise<{ success: boolean, startLocation?: string }> {
  if (!isLlmConnected()) return false; // This initialization requires LLM connection.

  // It's going to double-load in dev environment, and that's harmless. If you decide to add a flag check, you also
  // need to do something like have 3 potential return states, e.g., failed-try-again-after-llm-load, failed-dont-try-again, success.
  await WorldManager.loadWorld('encounters/world/genesis/world.json');
  await WorldManager.loadItems('encounters/world/genesis/items.json');
  const startLocation = WorldManager.getStartSceneLocation();
  const encounter = await loadEncounter(WorldManager.getEncounterPath(startLocation));
  initChat(encounter, setLines);
  setEncounter(encounter);
  if (encounter.model !== getConnectionModelId()) setModalDialogName(WrongModelDialog.name);
  if (encounter.model !== getConnectionModelId()) setModalDialogName(WrongModelDialog.name);
  return { success: true, startLocation };
}