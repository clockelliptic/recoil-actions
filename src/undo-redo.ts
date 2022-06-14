import { useRecoilCallback, RecoilState } from 'recoil';
import { undoRedoTokenAtom } from './recoil-state';
const cloneDeep = require('lodash/cloneDeep');

const uniqueId = (): string => String(Math.floor(Math.random() * Date.now()));

type HistoryItem = {
  label: string;
  undo: () => void;
  redo: () => void;
  release?: () => void;
};

type History = HistoryItem[];

/**
 * Private undo/redo state object. Should only be directly mutated by private _updateHistory function.
 * */
const _undoRedo: {
  index: number;
  history: History;
} = {
  index: -1,
  history: [],
};

/**
 * Module-scoped helper function for setting overwritable undo/redo history.
 * See body of action functions below for usage.
 * */
const _updateHistory = (newHistoryItem: HistoryItem): void => {
  const currentIndex = _undoRedo.index;
  const nextIndex = _undoRedo.index + 1;
  const maxIndex = _undoRedo.history.length - 1;
  if (currentIndex < maxIndex) {
    _undoRedo.history.splice(nextIndex).forEach((historyItem) => {
      historyItem.release?.();
    }); // release retained snapshots
  }
  _undoRedo.index = nextIndex;
  _undoRedo.history.push(newHistoryItem);
};

/**
 * Wrapper function for wrapping HistoryItem undo function.
 * This connects HistoryItem.undo implementation to undo/redo machine.
 */
export const _undoHistoryItem = (undoFn: () => void) => (): void => {
  const currentIndex = _undoRedo.index;
  _setCurrentIndex(currentIndex - 1);
  undoFn();
};

/**
 * Wrapper function for wrapping HistoryItem redo function.
 * This connects HistoryItem.redo implementation to undo/redo machine.
 */
export const _redoHistoryItem = (redoFn: () => void) => (): void => {
  const currentIndex = _undoRedo.index;
  _setCurrentIndex(currentIndex + 1);
  redoFn();
};

/**
 * Module-scoped setter function for setting history index.
 * See body of action functions below for usage.
 * */
const _setCurrentIndex = (newIndex: number): void => {
  _undoRedo.index = newIndex;
};

/**
 * Simple public object for reading and navigating undo/redo state.
 * Strictly hides direct mutation of undo/redo history and current index.
 * Undo/redo history mutations can only be performed by recoil callback actions defined below.
 * Undo/redo history can only be traversed with HistoryItem.undo and HistoryItem.redo.
 * See body of action functions below to see how HistoryItem undo/redo functions are defined.
 */
export const undoRedo: {
  current: () => number;
  history: () => typeof _undoRedo.history;
  reset: () => void;
} = {
  current: (): number => _undoRedo.index,
  history: (): HistoryItem[] => cloneDeep(_undoRedo.history),
  reset: (): void => {
    _undoRedo.index = -1;
    _undoRedo.history
      .splice(0)
      .forEach((historyItem) => historyItem.release?.()); // release retained snapshots
  },
};

/**
 * Adapter that connects action callbacks to undo/redo stack.
 */
type PerformAndRecordActionCB = (
  action: () => void,
  historyItem: HistoryItem,
  // recoil set function, passed from useRecoilCallback
  set: <T>(
    recoilVal: RecoilState<T>,
    valOrUpdater: T | ((currVal: T) => T)
  ) => void
) => void;

export const usePerformAndRecordActionCallback = (): PerformAndRecordActionCB =>
  useRecoilCallback(({ snapshot }) => (action, historyItem, set): void => {
    action();
    _updateHistory(historyItem);
    // trigger re-render to sync components with undo/redo (i.e. undo/redo buttons)
    set(undoRedoTokenAtom, uniqueId());
    // sync localstorage is performed in lidar-tool.tsx
  });
