import { useRecoilCallback } from "recoil";
import { _redoHistoryItem, _undoHistoryItem, usePerformAndRecordActionCallback } from "./undo-redo";

export const useGenericAction = (): ((fooToken: string) => Promise<void>) => {
  const performAndRecordAction = usePerformAndRecordActionCallback();
  return useRecoilCallback(({ set, reset, snapshot }) => {
    // must retain snapshot, otherwise snapshots are only good for a single render cycle
    const release = snapshot.retain();
    return async (fooToken: string): Promise<void> => {
      const action = (): void => {
        // set next state...
      };
      const counteraction = (): void => {
        // set to previous state...
      };
      const historyItem = {
        label: `mutate foo: ${"previousFoo"} --> ${"nextFoo"}`, // serialize diff for replay-ability, metrics, streaming to observers, etc.
        undo: _undoHistoryItem(counteraction),
        redo: _redoHistoryItem(action),
        release, // we must release snapshot when historyItem is deleted, otherwise memory leaks
      };
      performAndRecordAction(action, historyItem, set); // performAndRecordAction is a private function inside the actions.ts module
    };
  });
};