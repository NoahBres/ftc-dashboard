import { useEffect, useRef } from 'react';

interface CancelableWrapper {
  promise: Promise<any | void>;
  cancel: () => void;
}

function cancellable(promise: Promise<any | void>) {
  let isCanceled = false;

  const wrappedPromise = new Promise((resolve, reject) => {
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

  function newCancellablePromise(promise: Promise<any | void>) {
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
