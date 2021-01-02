import { useEffect, useRef } from 'react';

interface CancelableWrapper {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  promise: Promise<any | void>;
  cancel: () => void;
}

function cancellable<T>(promise: Promise<T>) {
  let isCanceled = false;

  const wrappedPromise = new Promise<T>((resolve, reject) => {
    promise
      .then((val) => (isCanceled ? reject(isCanceled) : resolve(val)))
      .catch((error) => (isCanceled ? reject(isCanceled) : reject(error)));
  });

  return {
    promise: wrappedPromise,
    cancel() {
      isCanceled = true;
    },
  };
}

export default function useCancellablePromise() {
  const promises = useRef<CancelableWrapper[]>([]);

  useEffect(() => {
    return () => {
      promises.current.forEach((e) => e.cancel());
      promises.current = [];
    };
  }, []);

  function newCancellablePromise<T>(promise: Promise<T>) {
    const cancelablePromise = cancellable(promise);
    promises.current.push(cancelablePromise);

    return cancelablePromise.promise;
  }

  function cancelAllPromises() {
    promises.current.forEach((e) => e.cancel());
    promises.current = [];
  }

  return { newCancellablePromise, cancelAllPromises };
}
