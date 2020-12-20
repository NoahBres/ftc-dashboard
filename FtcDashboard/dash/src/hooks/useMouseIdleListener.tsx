import { useEffect, useState, useRef } from 'react';

interface Props {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;

  width: string;
  height: string;

  timeout?: number;
}

export default function useMouseIdleListener(props: Props) {
  const [isIdle, setIsIdle] = useState(false);

  const timeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [listenerElement] = useState(() => {
    const el = document.createElement('div');
    el.style.position = 'fixed';
    if (props.top) el.style.top = props.top;
    if (props.bottom) el.style.bottom = props.bottom ?? '';
    if (props.left) el.style.left = props.bottom ?? '';
    if (props.right) el.style.right = props.right ?? '';
    el.style.width = props.width;
    el.style.height = props.height;
    el.style.pointerEvents = 'none';

    return el;
  });

  useEffect(() => {
    const listenMouseEvents = (e: MouseEvent) => {
      if (
        e.clientX > listenerElement.offsetLeft &&
        e.clientY > listenerElement.offsetTop &&
        e.clientX < listenerElement.offsetLeft + listenerElement.clientWidth &&
        e.clientY < listenerElement.offsetTop + listenerElement.clientHeight
      ) {
        const timeout = props.timeout ?? 5000;

        if (timeoutTimer.current !== null) {
          clearInterval(timeoutTimer.current);
        }

        timeoutTimer.current = setTimeout(() => setIsIdle(true), timeout);
        setIsIdle(false);
      }
    };

    document.body.appendChild(listenerElement);
    document.body.addEventListener('mousemove', listenMouseEvents);
    // listenerElement.addEventListener('mouseenter', listenMouseEvents);

    return () => {
      document.body.removeChild(listenerElement);
      document.body.removeEventListener('mousemove', listenMouseEvents);
      // listenerElement.removeEventListener('mouseenter', listenMouseEvents);
      if (timeoutTimer.current !== null) clearTimeout(timeoutTimer.current);
    };
  }, [listenerElement]);

  return isIdle;
}
