import styles from './ChatInputBox.module.css';

import ContentButton from '../contentButton/ContentButton';
import {useState} from "react";

type Props = {
  onSubmit:(text:string) => void,
  disabled?:boolean
}

function ChatInputBox(props:Props) {
  const { onSubmit, disabled } = props;
  const [text, setText] = useState<string>('');
  
  function _onSubmit() {
    onSubmit(text);
    setText('');
  }
  
  function _onKeyDown(e:React.KeyboardEvent<HTMLInputElement>) {
    if(e.key === 'Enter' && text !== '') _onSubmit();
  }
  
  return (
    <div className={styles.container}>
      <input className={styles.textInput} type="text" placeholder={'Say something...'} value={text} 
        onChange={(e) => setText(e.target.value)} onKeyDown={_onKeyDown} disabled={disabled}/>
      <ContentButton onClick={_onSubmit} text="Submit" disabled={disabled}/>
    </div>
  );
}

export default ChatInputBox;