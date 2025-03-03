import { useEffect, useState, useCallback, useRef } from 'react';
import globalEventEmitter from '../utils/event-emitter';

export const useEventEmitter = <T>(eventName: string) => {
  const [eventData, setEventData] = useState<T>();
  const skipRerender = useRef(false);

  const publishEvent = useCallback(
    (eventData: T, skipRender = true) => {
      skipRerender.current = skipRender;
      const event = new CustomEvent(eventName, { detail: eventData });
      globalEventEmitter.dispatchEvent(event);
    },
    [eventName],
  );

  useEffect(() => {
    const listener = (event: Event) => {
      if (skipRerender.current) {
        skipRerender.current = false;
        return;
      }
      setEventData((event as CustomEvent).detail);
    };

    globalEventEmitter.addEventListener(eventName, listener);

    // Cleanup subscription on unmount
    return () => {
      globalEventEmitter.removeEventListener(eventName, listener);
    };
  }, [eventName, skipRerender]);

  return { eventData, publishEvent };
};
