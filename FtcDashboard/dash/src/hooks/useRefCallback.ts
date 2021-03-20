import { useCallback, useRef } from 'react';

// https://medium.com/@teh_builder/ref-objects-inside-useeffect-hooks-eb7c15198780
export default function useRefCallback<T>(
  defaultVal: T,
  {
    mountHook,
    cleanupHook,
  }: { mountHook?: (ref: T) => void; cleanupHook?: (ref: T) => void },
) {
  const ref = useRef<T>(defaultVal);
  const setRef = useCallback(
    (node) => {
      if (ref.current) {
        cleanupHook?.(ref.current);
      }

      if (node) {
        mountHook?.(node);
      }

      ref.current = node;
    },
    [cleanupHook, mountHook],
  );

  return [ref, setRef];
}
