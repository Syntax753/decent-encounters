import { useState, useEffect } from "react";

import ModalDialog from "@/components/modalDialogs/ModalDialog";
import DialogButton from "@/components/modalDialogs/DialogButton";
import DialogFooter from "@/components/modalDialogs/DialogFooter";
import Encounter from "@/encounters/types/Encounter";
import styles from './EncounterConfigDialog.module.css';
import { textToEncounter } from "@/encounters/v0/readerUtil";

type Props = {
  encounter:Encounter,
  isOpen:boolean,
  onCancel:() => void,
  onSave:(encounter:Encounter) => void
}

function _onSaveClick(sourceText:string, onSave:(encounter:Encounter) => void, onSetLastError:(error:string) => void) {
  try {
    const encounter = textToEncounter(sourceText);
    onSave(encounter);
  } catch (e:any) {
    onSetLastError(`Error: ${e.message}`);
    return;
  }
}

function EncounterConfigDialog(props:Props) {
  const { onCancel, onSave, isOpen, encounter } = props;
  const [sourceText, setSourceText] = useState<string>(encounter?.sourceText || '');
  const [lastError, setLastError] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    setSourceText(encounter?.sourceText || '');
    setLastError('');
  }, [encounter, isOpen]);

  if (!isOpen) return null;

  return (
    <ModalDialog isOpen={isOpen} title='Configure Encounter'>
      <textarea className={styles.formInput} value={sourceText} onChange={(e) => setSourceText(e.target.value)} />
      <p>{lastError}</p>

      <DialogFooter>
        <DialogButton key='Cancel' text='Cancel' onClick={onCancel} />
        <DialogButton key='Save' text='Save' onClick={() => _onSaveClick(sourceText, onSave, setLastError)} isPrimary />
      </DialogFooter>
    </ModalDialog>
  );
}

export default EncounterConfigDialog;