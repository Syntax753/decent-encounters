import Encounter from "@/encounters/types/Encounter";
import { MIMETYPE_ENCOUNTER_MARKDOWN } from "@/persistence/mimeTypes";

function _getEncounterFilename(encounter:Encounter):string {
  const safeTitle = encounter.title ? encounter.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'encounter';
  return `${safeTitle}.enc.md`;
}

export async function downloadEncounter(encounter:Encounter):Promise<void> {
  if (!encounter.sourceText) throw new Error('Encounter has no source text to export.');
  const encounterBlob = new Blob([encounter.sourceText], { type: MIMETYPE_ENCOUNTER_MARKDOWN });
  const encounterUrl = URL.createObjectURL(encounterBlob);
  const downloadLink = document.createElement('a');
  downloadLink.href = encounterUrl;
  downloadLink.download = _getEncounterFilename(encounter);
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(encounterUrl);
}