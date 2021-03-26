import { useEffect, useReducer } from 'react';
import { useSelector } from 'react-redux';

import useOpModeLifecycle from './useOpModeLifecycle';
import { DateToHHMMSS } from '../DateFormatting';

import { RootState } from '../store/reducers';
import { TelemetryItem } from '../store/types';

export type TelemetryStoreItem = {
  timestamp: number;
  data: unknown[];
  log: string[];
};

type TelemetryStoreState<T> = {
  store: TelemetryStoreItem[];
  keys: string[];
  keyMeta: T[];
  defaultKeyMeta: T;
  raw: unknown[];
};

type TelemetryStoreAction<T> =
  | { type: 'SET'; payload: TelemetryStoreState<T> }
  | { type: 'APPEND'; payload: TelemetryItem }
  | { type: 'SET_KEY_META'; payload: { index: number; value: T } };

const createTelemetryStoreReducer = <T>() => (
  state: TelemetryStoreState<T>,
  action: TelemetryStoreAction<T>,
): TelemetryStoreState<T> => {
  switch (action.type) {
    case 'SET': {
      return action.payload;
    }
    case 'APPEND': {
      const { store, keys, raw, keyMeta, defaultKeyMeta } = state;
      const { timestamp, data, log } = action.payload;

      const newTelemetryStoreItem: TelemetryStoreItem = {
        timestamp,
        log,
        data: new Array(keys.length).fill(null),
      };

      for (const [key, value] of Object.entries(data)) {
        if (!keys.includes(key)) {
          keys.push(key);
          keyMeta.push(defaultKeyMeta);
        }

        newTelemetryStoreItem.data[keys.indexOf(key)] = value;
      }

      store.push(newTelemetryStoreItem);
      raw.push([
        DateToHHMMSS(new Date(timestamp)),
        ...newTelemetryStoreItem.data,
      ]);

      return {
        store,
        keys,
        keyMeta,
        defaultKeyMeta,
        raw,
      };
    }
    case 'SET_KEY_META': {
      const newMeta = [...state.keyMeta];
      newMeta[action.payload.index] = action.payload.value;

      return { ...state, keyMeta: newMeta };
    }
  }
};

export default function useTelemetryStore<KeyMetadataType>(
  defaultKeyMetadata: KeyMetadataType,
) {
  const telemetry = useSelector((state: RootState) => state.telemetry);

  const reducer = createTelemetryStoreReducer<KeyMetadataType>();
  const [internalStore, dispatch] = useReducer(reducer, {
    store: [],
    keys: [],
    keyMeta: [],
    defaultKeyMeta: defaultKeyMetadata,
    raw: [],
  });

  useEffect(() => {
    if (telemetry.length === 1 && telemetry[0].timestamp === 0) return;

    telemetry.forEach((e) => {
      dispatch({
        type: 'APPEND',
        payload: e,
      });
    });
  }, [telemetry]);

  useOpModeLifecycle({
    INIT: {
      onEnter: () => {
        dispatch({
          type: 'SET',
          payload: {
            store: [],
            keys: [],
            raw: [],
            keyMeta: [],
            defaultKeyMeta: defaultKeyMetadata,
          },
        });
      },
    },
    RUNNING: {
      onEnter: () => {
        dispatch({
          type: 'SET',
          payload: {
            store: [],
            keys: [],
            raw: [],
            keyMeta: [],
            defaultKeyMeta: defaultKeyMetadata,
          },
        });
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { defaultKeyMeta: _, ...store } = internalStore;

  return { store, dispatch };
}
