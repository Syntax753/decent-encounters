import { useEffect, useState } from "react";

import styles from './HomeScreen.module.css';
import { init } from "./interactions/initialization";
import LoadScreen from '@/loadScreen/LoadScreen';
import TopBar from '@/components/topBar/TopBar';
import Chat from "@/components/chat/Chat";
import { TextConsoleLine } from "@/components/textConsole/TextConsoleBuffer";
import { getVariables, restartEncounter, submitPrompt, updateEncounter } from "./interactions/chat";
import Encounter from "@/encounters/types/Encounter";
import ContentButton from "@/components/contentButton/ContentButton";
import EncounterConfigDialog from "./dialogs/EncounterConfigDialog";
import DiagnosticDialog from "./dialogs/DiagnosticDialog";
import { importEncounterFile } from "./interactions/import";
import { downloadEncounter } from "./interactions/export";
import AboutDialog from "./dialogs/AboutDialog";
import WrongModelDialog from "./dialogs/WrongModelDialog";

function HomeScreen() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lines, setLines] = useState<TextConsoleLine[]>([]);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [modalDialogName, setModalDialogName] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;

    init(setEncounter, setLines, setModalDialogName).then(isLlmConnected => {
      if (!isLlmConnected) { setIsLoading(true); return; }
    });
  }, [isLoading]);

  if (isLoading) return <LoadScreen onComplete={() => setIsLoading(false)} />;
  if (!encounter) return null;

  const vars = getVariables();
  const proximityRaw = vars['__vectorProximity'];
  const proximity = typeof proximityRaw === 'number' ? proximityRaw : 0;
  const isVictory = vars['__victory'] === true;

  return (
    <div className={styles.container}>
      <TopBar onAboutClick={() => setModalDialogName(AboutDialog.name)} />
      <div className={styles.content}>
        <h1>{encounter.title}</h1>
        {encounter.targetVectors && (
          <div style={{ marginBottom: '16px', background: '#222', padding: '8px', borderRadius: '4px', border: '1px solid #444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#999' }}>Instinct</span>
              <span style={{ fontSize: '12px', color: isVictory ? '#4caf50' : '#aaa' }}>
                {Math.round(proximity * 100)}% {encounter.victoryThreshold ? `/ ${Math.round(encounter.victoryThreshold * 100)}%` : ''}
              </span>
            </div>
            <div style={{ height: '8px', background: '#111', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.max(0, Math.min(100, proximity * 100))}%`,
                background: isVictory ? '#4caf50' : '#2196f3',
                transition: 'width 0.3s ease-in-out'
              }} />
            </div>
          </div>
        )}
        <Chat className={styles.chat} lines={lines} onChatInput={(prompt) => submitPrompt(prompt)} />
      </div>
      <div className={styles.encounterActions}>
        <h1>Encounter</h1>
        <ContentButton onClick={() => restartEncounter()} text="Restart" />
        <ContentButton onClick={() => setModalDialogName(EncounterConfigDialog.name)} text="Edit" />
        <ContentButton onClick={async () => {
          const nextEncounter = await importEncounterFile();
          if (nextEncounter) updateEncounter(nextEncounter, setEncounter, setModalDialogName);
        }} text="Import" />
        <ContentButton onClick={() => downloadEncounter(encounter)} text="Download" />
        <ContentButton onClick={() => setModalDialogName(DiagnosticDialog.name)} text="Diagnostics" />
      </div>
      <EncounterConfigDialog
        isOpen={modalDialogName === EncounterConfigDialog.name}
        encounter={encounter}
        onCancel={() => setModalDialogName(null)}
        onSave={(nextEncounter: Encounter) => { updateEncounter(nextEncounter, setEncounter, setModalDialogName); }}
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