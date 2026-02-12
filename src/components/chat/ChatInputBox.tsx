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

  function _onSubmit() {
    if (text.trim() === '') return;
    onSubmit(text);
    setHistory(prev => [...prev, text]);
    setHistoryIndex(-1); // Reset index to end
    setText('');
  }

  function _onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      _onSubmit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;

      const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setText(history[newIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (history.length === 0 || historyIndex === -1) return;

      const newIndex = historyIndex + 1;
      if (newIndex >= history.length) {
        setHistoryIndex(-1);
        setText('');
      } else {
        setHistoryIndex(newIndex);
        setText(history[newIndex]);
      }
    }
  }

  return (
    <div className={styles.container}>
      <input className={styles.textInput} type="text" placeholder={'Say something...'} value={text}
        onChange={(e) => setText(e.target.value)} onKeyDown={_onKeyDown} disabled={disabled} autoFocus />
      <ContentButton onClick={_onSubmit} text="Submit" disabled={disabled} />
    </div>
  );
}

export default ChatInputBox;