import { useEffect, useRef, useMemo } from 'react';

type ManagedWorker = {
  worker: Worker;
  messageListener: (e: MessageEvent) => void;
  messageErrorListener: (e: MessageEvent) => void;
  errorListener: (this: AbstractWorker, ev: ErrorEvent) => void;
};

export default function useWorker<T extends (...args: any) => any>(
  workerProp: T,
) {
  const workerPool = useRef<ManagedWorker[]>([]);

  const WebWorker = useMemo(
    () => (worker: T) => {
      const wrap = (body: string) => `
(() => {
  self.addEventListener('message', (e) => {
    if(!e) return;

    const workerResult = ${body};

    postMessage(workerResult(...e.data));
  });
})();`;

      const blob = new Blob([wrap(worker.toString())]);
      return new Worker(URL.createObjectURL(blob));
    },
    [],
  );

  const cleanWorker = (worker: ManagedWorker) => {
    worker.worker.terminate();
    worker.worker.removeEventListener('message', worker.messageListener);
    worker.worker.removeEventListener(
      'messageerror',
      worker.messageErrorListener,
    );
    worker.worker.removeEventListener('error', worker.errorListener);
  };

  const worker = useMemo(
    () => (...parameters: Parameters<T>) => {
      return new Promise<ReturnType<T>>((resolve, reject) => {
        const newWorker = WebWorker(workerProp);

        const cleanPostMessage = () => {
          const workerIndex = workerPool.current.findIndex(
            (e) => e.worker === newWorker,
          );

          if (workerIndex !== -1) {
            cleanWorker(workerPool.current[workerIndex]);
            workerPool.current.splice(workerIndex, 1);
          }
        };

        const messageListener = (e: MessageEvent) => {
          cleanPostMessage();
          resolve(e.data);
        };

        const messageErrorListener = (e: MessageEvent) => {
          cleanPostMessage();
          reject(e);
        };

        function errorListener(this: AbstractWorker, ev: ErrorEvent) {
          cleanPostMessage();
          reject(ev);
        }

        workerPool.current.push({
          worker: newWorker,
          messageListener,
          errorListener,
          messageErrorListener,
        });
        newWorker.onmessage = messageListener;
        newWorker.onmessageerror = messageErrorListener;
        newWorker.onerror = errorListener;

        newWorker.postMessage(parameters);
      });
    },
    [WebWorker, workerProp],
  );

  useEffect(() => {
    workerPool.current.forEach((e) => cleanWorker(e));
    workerPool.current = [];
  }, []);

  return worker;
}
