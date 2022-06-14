import { atom } from 'recoil';
/**
 * Pretty much exclusively for undo/redo buttons.
 * Undo redo dependency trigger. Subscribing undo/redo
 * buttons to this causes re-render. We push a random token
 * onto this atom when a user action is performed.
 * */
 export const undoRedoTokenAtom = atom({
  key: 'undoRedoTokenAtom',
  default: '',
});