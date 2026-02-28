import { useState, useEffect, useRef } from "react";
import { ModelDeviceProblemsDialog, ModelDeviceProblem } from "decent-portal";

import styles from './LoadScreen.module.css';
import { init, startLoadingModel } from "./interactions/initialization";
import ProgressBar from '@/components/progressBar/ProgressBar';
import TopBar from '@/components/topBar/TopBar';
import ContentButton from "@/components/contentButton/ContentButton";
import AboutDialog from "@/homeScreen/dialogs/AboutDialog";

import SceneSelector from "@/components/sceneSelector/SceneSelector";

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
  const [confirmedUrl, setConfirmedUrl] = useState<string | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState<boolean>(false);
  const { onComplete } = props;

  useEffect(() => {
    if (!isReadyToLoad) {
      init(setModelId, setProblems, setModalDialogName).then(setIsReadyToLoad);
      return;
    }
    startLoadingModel(modelId, setPercentComplete, setCurrentTask)
      .then((isInitialized) => { if (isInitialized) setIsModelLoaded(true); });
  }, [isReadyToLoad, modelId]);

  useEffect(() => {
    if (isModelLoaded && confirmedUrl) {
      onComplete(confirmedUrl);
    }
  }, [isModelLoaded, confirmedUrl, onComplete]);

  const statusContent = wasLoadCancelled ? (
    <div className={styles.cancelledMessage}>
      <p>Model loading was cancelled.</p>
      <p><ContentButton text='Try Again' onClick={() => window.location.reload()} /></p>
    </div>
  ) : (
    <div className={styles.progressBarContainer}>
      <ProgressBar percentComplete={percentComplete} />
      <div style={{ marginTop: '10px' }}>{currentTask}</div>

      <SceneSelector onSelect={(url) => setConfirmedUrl(url)} />
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