import styles from "./ChatHistory.module.css";
import TextConsole from "../textConsole/TextConsole";
import { TextConsoleLine } from "../textConsole/TextConsoleBuffer";
import WaitingEllipsis from "../waitingEllipsis/WaitingEllipsis";

export const PLAYER_PREFIX = 'PLAYER:';
export const NARRATION_PREFIX = 'NARRATION:';
export const ASCII_ART_PREFIX = 'ASCII_ART:';

type Props = {
  lines: TextConsoleLine[],
  validDirections?: string[]
}

function _onRenderLine(key: number, text: string) {
  let className = '';
  if (text === '...') {
    return <WaitingEllipsis key={key} />
  } else if (text.startsWith(PLAYER_PREFIX)) {
    text = text.substring(PLAYER_PREFIX.length);
    className = styles.playerLine;
  } else if (text.startsWith(NARRATION_PREFIX)) {
    text = text.substring(NARRATION_PREFIX.length);
    className = styles.narrativeLine;
  } else if (text.startsWith(ASCII_ART_PREFIX)) {
    text = text.substring(ASCII_ART_PREFIX.length);
    className = styles.asciiArtLine;
  } else {
    className = styles.characterLine;
  }
  if (text.endsWith('...')) {
    text = text.substring(0, text.length - 3);
    return (<p className={className} key={key}>{text}<WaitingEllipsis trailing /></p>);
  } else {
    return (<p className={className} key={key}>{text}</p>);
  }
}

function ChatHistory(props: Props) {
  const { lines, validDirections } = props;

  const formatDirections = (dirs: string[]) => {
    if (dirs.length === 0) return '';
    if (dirs.length === 1) return `You can exit to the ${dirs[0]}`;
    if (dirs.length === 2) return `You can exit to the ${dirs[0]} or ${dirs[1]}`;
    const allButLast = dirs.slice(0, -1).join(', ');
    return `You can exit to the ${allButLast} or ${dirs[dirs.length - 1]}`;
  };

  return (
    <div className={styles.container}>
      {validDirections && validDirections.length > 0 && (
        <div className={styles.directionsBar}>
          {formatDirections(validDirections)}
        </div>
      )}
      <TextConsole className={styles.console} lines={lines} onRenderLine={_onRenderLine} />
    </div>
  );
}

export default ChatHistory;