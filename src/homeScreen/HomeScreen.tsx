import { useEffect, useState } from "react";

import styles from './HomeScreen.module.css';
import { init } from "./interactions/initialization";
import LoadScreen from '@/loadScreen/LoadScreen';
import TopBar from '@/components/topBar/TopBar';
import Chat from "@/components/chat/Chat";
import { TextConsoleLine } from "@/components/textConsole/TextConsoleBuffer";
import { getVariables, restartEncounter, submitPrompt, updateEncounter, jumpToUrl } from "./interactions/chat";
import SceneSelector from "@/components/sceneSelector/SceneSelector";
import Encounter, { SceneType } from "@/encounters/types/Encounter";
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
  const [selectedEncounterUrl, setSelectedEncounterUrl] = useState<string | undefined>(undefined);
  const [isSceneSelecting, setIsSceneSelecting] = useState<boolean>(false);

  useEffect(() => {
    if (isLoading) return;

    init(setEncounter, setLines, setModalDialogName, selectedEncounterUrl).then(isLlmConnected => {
      if (!isLlmConnected) { setIsLoading(true); return; }
    });
  }, [isLoading]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading && encounter) {
        setIsSceneSelecting(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, encounter]);

  if (isLoading) return <LoadScreen onComplete={(url) => { setSelectedEncounterUrl(url); setIsLoading(false); }} />;
  if (!encounter) return null;

  const vars = getVariables();
  const proximityRaw = vars['__vectorProximity'];
  const proximity = typeof proximityRaw === 'number' ? proximityRaw : (encounter.sceneType === SceneType.WIN_LOSE ? 0.5 : 0);
  const isVictory = vars['__victory'] === true;

  if (isSceneSelecting) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        backgroundColor: '#fff',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <SceneSelector
          onSelect={(url) => {
            setIsSceneSelecting(false);
            jumpToUrl(url);
          }}
          onCancel={() => setIsSceneSelecting(false)}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <TopBar onAboutClick={() => setModalDialogName(AboutDialog.name)} />
      <div className={styles.content}>
        <h1>{encounter.title}</h1>
        <div className={styles.lowerArea}>
          {(encounter.sceneType === SceneType.WIN_LOSE || encounter.sceneType === SceneType.WIN_ONLY) && (
            <div className={styles.proximityContainer}>
              <div style={{ position: 'relative', height: '24px', background: '#111', borderRadius: '4px', overflow: 'hidden' }} title={`Instinct: ${proximity.toFixed(2)}`}>

                {/* Title */}
                <div style={{
                  position: 'absolute',
                  top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  color: '#fff', fontSize: '13px', fontWeight: 'bold', zIndex: 2, textShadow: '1px 1px 2px #000', pointerEvents: 'none'
                }}>
                  Instinct
                </div>

                {encounter.sceneType === SceneType.WIN_LOSE ? (
                  <>
                    {/* Green fill from the left */}
                    <div style={{
                      position: 'absolute',
                      top: 0, bottom: 0, left: 0,
                      width: `${Math.max(0, Math.min(100, proximity * 100))}%`,
                      background: '#4caf50',
                      transition: 'width 0.3s ease-in-out'
                    }} />
                    {/* Red fill from the right */}
                    <div style={{
                      position: 'absolute',
                      top: 0, bottom: 0, right: 0,
                      width: `${Math.max(0, Math.min(100, (1 - proximity) * 100))}%`,
                      background: '#f44336',
                      transition: 'width 0.3s ease-in-out'
                    }} />
                  </>
                ) : (
                  <div style={{
                    position: 'absolute',
                    top: 0, bottom: 0, left: 0,
                    width: `${Math.max(0, Math.min(100, proximity * 100))}%`,
                    background: isVictory ? '#4caf50' : '#2196f3',
                    transition: 'width 0.3s ease-in-out'
                  }} />
                )}

                {encounter.sceneType === SceneType.WIN_LOSE && encounter.lossThreshold !== null && (
                  <>
                    <div style={{
                      position: 'absolute',
                      top: 0, bottom: 0,
                      left: `calc(${encounter.lossThreshold * 100}% - 1px)`,
                      width: '2px',
                      background: 'rgba(255, 215, 0, 0.5)'
                    }} />
                    <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '8px', color: '#fff', fontSize: '12px', zIndex: 1, textShadow: '1px 1px 2px #000' }}>
                      Loss: {Math.round(encounter.lossThreshold * 100)}%
                    </div>
                  </>
                )}

                {encounter.targetThreshold !== null && (
                  <>
                    <div style={{
                      position: 'absolute',
                      top: 0, bottom: 0,
                      left: `calc(${encounter.targetThreshold * 100}% - 1px)`,
                      width: '2px',
                      background: 'rgba(255, 215, 0, 0.5)'
                    }} />
                    <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: '8px', color: '#fff', fontSize: '12px', zIndex: 1, textShadow: '1px 1px 2px #000' }}>
                      Win: {Math.round(encounter.targetThreshold * 100)}%
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {encounter.sideVectors && encounter.sideVectors.map((sv, idx) => {
            const svInstinctRaw = vars[`__sideVectorInstinct_${idx}`];
            const svInstinct = typeof svInstinctRaw === 'number' ? svInstinctRaw : 0;
            const svProximity = svInstinct / 100;

            return (
              <div key={idx} className={styles.proximityContainer} style={{ marginTop: '8px' }}>
                <div style={{ position: 'relative', height: '16px', background: '#222', borderRadius: '4px', overflow: 'hidden' }} title={`Side Vector [${sv.name}]: ${svProximity.toFixed(2)}`}>
                  <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    color: '#ccc', fontSize: '11px', fontWeight: 'bold', zIndex: 2, textShadow: '1px 1px 2px #000', pointerEvents: 'none'
                  }}>
                    {sv.name}
                  </div>

                  <div style={{
                    position: 'absolute',
                    top: 0, bottom: 0, left: 0,
                    width: `${Math.max(0, Math.min(100, svProximity * 100))}%`,
                    background: '#9c27b0', // purple
                    transition: 'width 0.3s ease-in-out'
                  }} />

                  <div style={{
                    position: 'absolute',
                    top: 0, bottom: 0,
                    left: `calc(${sv.threshold * 100}% - 1px)`,
                    width: '2px',
                    background: 'rgba(255, 215, 0, 0.5)'
                  }} />
                </div>
              </div>
            );
          })}
        </div>
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