import Encounter from "@/encounters/types/Encounter";
import { textToEncounter } from "@/encounters/v0/readerUtil";
import { MIMETYPE_MARKDOWN, MIMETYPE_ENCOUNTER_MARKDOWN } from "@/persistence/mimeTypes";

async function _selectEncounterFileHandle():Promise<FileSystemFileHandle|null> {
    const openFileOptions = {
        excludeAcceptAllOption: true,
        multiple:false,
        types: [{
            description: 'Encounter Markdown files',
            accept: {
                [MIMETYPE_MARKDOWN]: ['.md'],
                [MIMETYPE_ENCOUNTER_MARKDOWN]: ['.enc.md', '.encounter.md']
            }
        }]
    };
    try {
        const handles:FileSystemFileHandle[] = await ((window as any).showOpenFilePicker(openFileOptions));
        return handles[0];
    } catch(_ignoredAbortError) {
        return null;
    }
}

async function _readFileAsString(fileHandle:FileSystemFileHandle):Promise<string> {
  const file = await fileHandle.getFile();
  return await file.text();
}

export async function importEncounterFile():Promise<Encounter|null> {
  const fileHandle = await _selectEncounterFileHandle();
  if (!fileHandle) return null; // Not an error, user canceled.

  const fileText = await _readFileAsString(fileHandle);
  return textToEncounter(fileText);
}