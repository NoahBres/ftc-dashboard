import { useCallback, useRef, MutableRefObject } from 'react';

// https://medium.com/@teh_builder/ref-objects-inside-useeffect-hooks-eb7c15198780
export default function useRefCallback<T>(
  defaultVal: T,
  hooks?: { mountHook?: (ref: T) => void; cleanupHook?: (ref: T) => void },
): [MutableRefObject<T>, (node: unknown) => void] {
  const ref = useRef<T>(defaultVal);
  const setRef = useCallback(
    (node) => {
      if (ref.current) {
        hooks?.cleanupHook?.(ref.current);
      }

      if (node) {
        hooks?.mountHook?.(node);
      }

      ref.current = node;
    },
    [hooks],
  );

  return [ref, setRef];
}
