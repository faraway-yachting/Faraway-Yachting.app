import { useRef, useCallback } from 'react';

/**
 * Hook that provides an auto-save-as-draft function.
 * Call `triggerAutoDraft` whenever form data changes.
 * It will call `saveDraft` after `delay` ms of inactivity,
 * but only if `canSave` returns true.
 */
export function useAutoDraft(
  saveDraft: () => Promise<void>,
  canSave: () => boolean,
  delay: number = 3000
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const hasSavedRef = useRef(false);

  const triggerAutoDraft = useCallback(() => {
    // Already saved once as draft — stop auto-saving
    if (hasSavedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (isSavingRef.current || !canSave()) return;
      isSavingRef.current = true;
      try {
        await saveDraft();
        hasSavedRef.current = true;
      } catch (err) {
        console.error('Auto-draft save failed:', err);
      } finally {
        isSavingRef.current = false;
      }
    }, delay);
  }, [saveDraft, canSave, delay]);

  const cancelAutoDraft = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { triggerAutoDraft, cancelAutoDraft, hasSavedOnce: hasSavedRef };
}
