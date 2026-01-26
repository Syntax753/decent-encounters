import { useEffect, useState } from "react";

import styles from './HomeScreen.module.css';
import { init } from "./interactions/initialization";
import LoadScreen from '@/loadScreen/LoadScreen';
import TopBar from '@/components/topBar/TopBar';
import Chat from "@/components/chat/Chat";
import { TextConsoleLine } from "@/components/textConsole/TextConsoleBuffer";
import { submitPrompt, updateEncounter } from "./interactions/chat";
import Encounter from "@/encounters/types/Encounter";
import { createDefaultEncounter } from "@/encounters/encounterUtil";
import EncounterConfigDialog from "./dialogs/EncounterConfigDialog";
import ContentButton from "@/components/contentButton/ContentButton";

function HomeScreen() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lines, setLines] = useState<TextConsoleLine[]>([]);
  const [encounter, setEncounter] = useState<Encounter>(createDefaultEncounter());
  const [modalDialogName, setModalDialogName] = useState<string|null>(null);
  
  useEffect(() => {
    if (isLoading) return;

    init(encounter, setLines).then(isLlmConnected => { 
      if (!isLlmConnected) { setIsLoading(true); return; }
    });
  }, [isLoading]);

  if (isLoading) return <LoadScreen onComplete={() => setIsLoading(false)} />;

  function _closeDialog() { setModalDialogName(null); }
  
  return (
    <div className={styles.container}>
      <TopBar />
      <div className={styles.content}>
        <h1>{encounter.title}</h1>
        <Chat className={styles.chat} lines={lines} onChatInput={(prompt) => submitPrompt(prompt, setLines)} />
      </div>
      <div className={styles.encounterActions}>
        <ContentButton onClick={() => setModalDialogName(EncounterConfigDialog.name)} text="Configure Encounter" />
      </div>
      <EncounterConfigDialog 
        isOpen={modalDialogName===EncounterConfigDialog.name} 
        encounter={encounter} 
        onCancel={_closeDialog}
        onSave={nextEncounter => updateEncounter(nextEncounter, setEncounter, setModalDialogName, setLines)}
      />
    </div>
  );
}

export default HomeScreen;