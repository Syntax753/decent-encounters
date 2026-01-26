import ChatHistory from "./ChatHistory";
import ChatInputBox from "./ChatInputBox";

import {TextConsoleLine} from "../textConsole/TextConsoleBuffer";

type Props = {
  className:string,
  lines:TextConsoleLine[],
  onChatInput:(text:string) => void,
  disabled?:boolean
}

function Chat(props:Props) {
  const {className, lines, onChatInput, disabled} = props;

  return (
    <div className={className}>
      <ChatHistory lines={lines} />
      <ChatInputBox onSubmit={onChatInput} disabled={disabled}/>
    </div>
  );
}

export default Chat;