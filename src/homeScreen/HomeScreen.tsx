import { useEffect, useState } from "react";

import styles from './HomeScreen.module.css';
import { init } from "./interactions/initialization";
import LoadScreen from '@/loadScreen/LoadScreen';
import TopBar from '@/components/topBar/TopBar';
import Chat from "@/components/chat/Chat";
import { TextConsoleLine } from "@/components/textConsole/TextConsoleBuffer";
import { submitPrompt } from "./interactions/chat";
import Encounter from "@/encounters/types/Encounter";
import ContentButton from "@/components/contentButton/ContentButton";

function HomeScreen() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lines, setLines] = useState<TextConsoleLine[]>([]);
  const [encounter, setEncounter] = useState<Encounter|null>(null);
  
  useEffect(() => {
    if (isLoading) return;

    init(setEncounter, setLines).then(isLlmConnected => { 
      if (!isLlmConnected) { setIsLoading(true); return; }
    });
  }, [isLoading]);

  if (isLoading) return <LoadScreen onComplete={() => setIsLoading(false)} />;
  if (!encounter) return null;
  
  return (
    <div className={styles.container}>
      <TopBar />
      <div className={styles.content}>
        <h1>{encounter.title}</h1>
        <Chat className={styles.chat} lines={lines} onChatInput={(prompt) => submitPrompt(prompt, setLines)} />
      </div>
      <div className={styles.encounterActions}>
        <ContentButton onClick={() => {}} text="Configure Encounter" />
      </div>
    </div>
  );
}

export default HomeScreen;