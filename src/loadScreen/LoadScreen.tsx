import { useState, useEffect, useRef } from "react";
import { ModelDeviceProblemsDialog, ModelDeviceProblem } from "decent-portal";

import styles from './LoadScreen.module.css';
import { init, startLoadingModel } from "./interactions/initialization";
import ProgressBar from '@/components/progressBar/ProgressBar';
import TopBar from '@/components/topBar/TopBar';
import ContentButton from "@/components/contentButton/ContentButton";
import AboutDialog from "@/homeScreen/dialogs/AboutDialog";

import { EncounterStub, loadEncounterList } from "@/encounters/encounterUtil";

type Props = {
  onComplete: (encounterUrl?: string) => void;
}

function LoadScreen(props: Props) {
  const [percentComplete, setPercentComplete] = useState(0);
  const [isReadyToLoad, setIsReadyToLoad] = useState<boolean>(false);
  const [wasLoadCancelled, setWasLoadCancelled] = useState<boolean>(false);
  const [modalDialogName, setModalDialogName] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string>('');
  const [currentTask, setCurrentTask] = useState('Loading');
  const [problems, setProblems] = useState<ModelDeviceProblem[] | null>(null);
  const [encounters, setEncounters] = useState<EncounterStub[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isModelLoaded, setIsModelLoaded] = useState<boolean>(false);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { onComplete } = props;

  useEffect(() => {
    loadEncounterList().then(list => {
      setEncounters(list);
    });
  }, []);

  useEffect(() => {
    if (!isReadyToLoad) {
      init(setModelId, setProblems, setModalDialogName).then(setIsReadyToLoad);
      return;
    }
    startLoadingModel(modelId, setPercentComplete, setCurrentTask)
      .then((isInitialized) => { if (isInitialized) setIsModelLoaded(true); });
  }, [isReadyToLoad, modelId]);

  useEffect(() => {
    if (isModelLoaded && isConfirmed) {
      onComplete(encounters[selectedIndex]?.url);
    }
  }, [isModelLoaded, isConfirmed, encounters, selectedIndex, onComplete]);

  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (encounters.length === 0) return;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(encounters.length - 1, prev + 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        setIsConfirmed(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [encounters]);

  const statusContent = wasLoadCancelled ? (
    <div className={styles.cancelledMessage}>
      <p>Model loading was cancelled.</p>
      <p><ContentButton text='Try Again' onClick={() => window.location.reload()} /></p>
    </div>
  ) : (
    <div className={styles.progressBarContainer}>
      <ProgressBar percentComplete={percentComplete} />
      <div style={{ marginTop: '10px' }}>{currentTask}</div>

      <div style={{ marginTop: '30px', textAlign: 'left', width: '100%', maxWidth: '600px', margin: '30px auto 0 auto' }}>
        <h2 style={{ color: '#ccc', marginBottom: '10px', fontSize: '1.2rem' }}>Select an Encounter:</h2>
        <div
          style={{ maxHeight: '300px', overflowY: 'auto', background: '#111', borderRadius: '8px', padding: '10px' }}
          tabIndex={0}
          autoFocus
        >
          {encounters.map((enc, idx) => (
            <div
              key={enc.url}
              ref={el => itemRefs.current[idx] = el}
              onClick={() => {
                setSelectedIndex(idx);
                setIsConfirmed(true);
              }}
              style={{
                padding: '10px',
                cursor: 'pointer',
                background: idx === selectedIndex ? '#fff' : 'transparent',
                color: idx === selectedIndex ? '#000' : '#aaa',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between'
              }}
            >
              <span style={{ fontWeight: 'bold' }}>{enc.title}</span>
              <span style={{ fontSize: '0.8rem', color: idx === selectedIndex ? '#333' : '#666' }}>{enc.url}</span>
            </div>
          ))}
        </div>
        <p style={{ marginTop: '10px', fontSize: '0.8rem', color: '#666', textAlign: 'center' }}>
          Use Arrow Keys to highlight and Enter to load. Or click with your mouse.
        </p>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <TopBar onAboutClick={() => setModalDialogName(AboutDialog.name)} />
      <div className={styles.content}>
        {statusContent}
      </div>

      <ModelDeviceProblemsDialog
        isOpen={modalDialogName === ModelDeviceProblemsDialog.name}
        modelId={modelId}
        problems={problems}
        onConfirm={() => { setModalDialogName(null); setIsReadyToLoad(true); }}
        onCancel={() => { setModalDialogName(null); setWasLoadCancelled(true); }}
      />
      <AboutDialog
        isOpen={modalDialogName === AboutDialog.name}
        onClose={() => setModalDialogName(null)}
      />
    </div>
  );
}

export default LoadScreen;