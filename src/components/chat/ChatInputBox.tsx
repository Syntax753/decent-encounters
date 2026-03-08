import styles from './ChatInputBox.module.css';

import ContentButton from '../contentButton/ContentButton';
import { useState } from "react";

type Props = {
  onSubmit: (text: string) => void,
  disabled?: boolean
}

function ChatInputBox(props: Props) {
  const { onSubmit, disabled } = props;
  const [text, setText] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [draftText, setDraftText] = useState<string>('');

  function _onSubmit() {
    if (text.trim() === '') return;
    onSubmit(text);
    setHistory(prev => [...prev, text]);
    setHistoryIndex(-1);
    setText('');
    setDraftText('');
  }

  function _onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && text !== '') {
      _onSubmit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      if (historyIndex === -1) {
        setDraftText(text); // Save current typed text before navigating history
      }
      const nextIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setText(history[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return; // Already at the bottom
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(-1);
        setText(draftText); // Restore what they were typing
      } else {
        setHistoryIndex(nextIndex);
        setText(history[nextIndex]);
      }
    }
  }

  return (
    <div className={styles.container}>
      <input className={styles.textInput} type="text" placeholder={'Say something...'} value={text}
        onChange={(e) => {
          setText(e.target.value);
          setHistoryIndex(-1); // Reset history index on manual edit
        }}
        onKeyDown={_onKeyDown} disabled={disabled} autoFocus />
      <ContentButton onClick={_onSubmit} text="Submit" disabled={disabled} />
    </div>
  );
}

export default ChatInputBox;