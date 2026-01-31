// import { useState } from "react";

import ModalDialog from "@/components/modalDialogs/ModalDialog";
import DialogButton from "@/components/modalDialogs/DialogButton";
import DialogFooter from "@/components/modalDialogs/DialogFooter";
import Encounter from "@/encounters/types/Encounter";
// import styles from './EncounterConfigDialog.module.css';
// import { assert } from "decent-portal";

type Props = {
  encounter:Encounter,
  isOpen:boolean,
  onCancel:() => void,
  onSave:(encounter:Encounter) => void
}

function EncounterConfigDialog(props:Props) {
  const { onCancel, isOpen} = props;

  return (
    <ModalDialog isOpen={isOpen} title='Configure Encounter'>
      <p>TODO</p>
      
      <DialogFooter>
        <DialogButton text='Cancel' onClick={onCancel} />
        <DialogButton text='Save' onClick={() => {}} isPrimary />
      </DialogFooter>
    </ModalDialog>
  );
}

export default EncounterConfigDialog;