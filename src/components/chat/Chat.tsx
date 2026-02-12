import ChatHistory from "./ChatHistory";
import ChatInputBox from "./ChatInputBox";

import { TextConsoleLine } from "../textConsole/TextConsoleBuffer";

import { useEffect } from "react";

type Props = {
  className: string,
  lines: TextConsoleLine[],
  onChatInput: (text: string) => void,
  disabled?: boolean,
  isWaiting?: boolean
}

function Chat(props: Props) {
  const { className, lines, onChatInput, disabled, isWaiting } = props;

  useEffect(() => {
    if (!isWaiting) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onChatInput('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWaiting, onChatInput]);

  return (
    <div className={className}>
      <ChatHistory lines={lines} />
      {!isWaiting && <ChatInputBox onSubmit={onChatInput} disabled={disabled} />}
    </div>
  );
}

export default Chat;