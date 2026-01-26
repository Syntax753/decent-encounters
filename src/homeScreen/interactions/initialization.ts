import { isLlmConnected } from "@/llm/llmUtil";
import { initChat } from "./chat";
import Encounter from "@/encounters/types/Encounter";

export async function init(encounter:Encounter, setLines:Function):Promise<boolean> {
  if (!isLlmConnected()) return false;
  initChat(encounter, setLines);
  return true;
}