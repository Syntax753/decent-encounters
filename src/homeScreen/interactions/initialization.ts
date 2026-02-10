import { getConnectionModelId, isLlmConnected } from "@/llm/llmUtil";
import { initChat } from "./chat";
import { loadEncounter } from "@/encounters/encounterUtil";
import WrongModelDialog from "../dialogs/WrongModelDialog";

export async function init(setEncounter:Function, setLines:Function, setModalDialogName:Function):Promise<boolean> {
  if (!isLlmConnected()) return false; // This initialization requires LLM connection.

  // It's going to double-load in dev environment, and that's harmless. If you decide to add a flag check, you also
  // need to do something like have 3 potential return states, e.g., failed-try-again-after-llm-load, failed-dont-try-again, success.
  const encounter = await loadEncounter('encounters/troll.md');
  initChat(encounter, setLines);
  setEncounter(encounter);
  if (encounter.model !== getConnectionModelId()) setModalDialogName(WrongModelDialog.name);
  return true;
}