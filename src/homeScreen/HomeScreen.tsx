import { useEffect, useState } from "react";

import styles from './HomeScreen.module.css';
import directionsStyles from '@/components/chat/ChatHistory.module.css';
import { init } from "./interactions/initialization";
import LoadScreen from '@/loadScreen/LoadScreen';
import TopBar from '@/components/topBar/TopBar';
import Chat from "@/components/chat/Chat";
import { TextConsoleLine } from "@/components/textConsole/TextConsoleBuffer";
import { restartEncounter, submitPrompt, updateEncounter } from "./interactions/chat";
import Encounter from "@/encounters/types/Encounter";
import ContentButton from "@/components/contentButton/ContentButton";
import EncounterConfigDialog from "./dialogs/EncounterConfigDialog";
import DiagnosticDialog from "./dialogs/DiagnosticDialog";
import { importEncounterFile } from "./interactions/import";
import { loadEncounter } from "@/encounters/encounterUtil";
import WorldManager from "@/encounters/WorldManager";
import { downloadEncounter } from "./interactions/export";
import AboutDialog from "./dialogs/AboutDialog";
import WrongModelDialog from "./dialogs/WrongModelDialog";

function HomeScreen() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lines, setLines] = useState<TextConsoleLine[]>([]);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [modalDialogName, setModalDialogName] = useState<string | null>(null);
  const [isWaitingForTransition, setIsWaitingForTransition] = useState<boolean>(false);
  const [location, setLocation] = useState<string>('');

  useEffect(() => {
    if (isLoading) return;

    init(setEncounter, setLines, setModalDialogName).then(result => {
      if (!result.success) { setIsLoading(true); return; }
      if (result.startLocation) setLocation(result.startLocation);
    });
  }, [isLoading]);

  if (isLoading) return <LoadScreen onComplete={() => setIsLoading(false)} />;
  if (!encounter) return null;

  return (
    <div className={styles.container}>
      <TopBar
        onAboutClick={() => setModalDialogName(AboutDialog.name)}
      />
      <div className={styles.content}>
        <h1>{encounter.title}</h1>
        <Chat
          key={encounter.title}
          className={styles.chat}
          lines={lines}
          isWaiting={isWaitingForTransition}
          onChatInput={(prompt) => submitPrompt(prompt, setLines, async (nextLocation: string) => {
            const nextEncounter = await loadEncounter(WorldManager.getEncounterPath(nextLocation));
            setLocation(nextLocation);
            updateEncounter(nextEncounter, setEncounter, setModalDialogName, setLines, nextLocation);
          }, setIsWaitingForTransition)}
        />
        {(() => {
          const text = WorldManager.getDirectionsText(location);
          if (!text) return null;
          return <div className={directionsStyles.directionsBar}>{text}</div>;
        })()}
      </div>
      <div className={styles.encounterActions}>
        <h1>Encounter</h1>
        <ContentButton onClick={() => restartEncounter(encounter, setLines)} text="Restart" />
        <ContentButton onClick={() => setModalDialogName(EncounterConfigDialog.name)} text="Edit" />
        <ContentButton onClick={async () => {
          const nextEncounter = await importEncounterFile();
          if (nextEncounter) {
            setLocation(''); // Imported encounters don't have a world location
            updateEncounter(nextEncounter, setEncounter, setModalDialogName, setLines, '');
          }
        }} text="Import" />
        <ContentButton onClick={() => downloadEncounter(encounter)} text="Download" />
        <ContentButton onClick={() => setModalDialogName(DiagnosticDialog.name)} text="Diagnostics" />
      </div>
      <EncounterConfigDialog
        isOpen={modalDialogName === EncounterConfigDialog.name}
        encounter={encounter}
        onCancel={() => setModalDialogName(null)}
        onSave={(nextEncounter: Encounter) => { updateEncounter(nextEncounter, setEncounter, setModalDialogName, setLines, location); }}
      />
      <DiagnosticDialog
        isOpen={modalDialogName === DiagnosticDialog.name}
        onClose={() => setModalDialogName(null)}
      />
      <AboutDialog
        isOpen={modalDialogName === AboutDialog.name}
        onClose={() => setModalDialogName(null)}
      />
      <WrongModelDialog
        expectedModelId={encounter ? encounter.model : 'unknown'}
        isOpen={modalDialogName === WrongModelDialog.name}
        onClose={() => setModalDialogName(null)}
      />
    </div>
  );
}

export default HomeScreen;