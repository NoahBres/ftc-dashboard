import React, {
  useRef,
  useState,
  useReducer,
  useEffect,
  FormEventHandler,
} from 'react';
import { useSelector } from 'react-redux';

import { Transition, Switch } from '@headlessui/react';

import BaseView, {
  BaseViewHeading,
  BaseViewBody,
  BaseViewIcons,
  BaseViewIconButton,
  BaseViewProps,
  BaseViewHeadingProps,
} from './BaseView';
import GraphCanvas from './GraphCanvas';
import TextInput from '../components/inputs/TextInput';

import { ReactComponent as PlayIcon } from '../assets/icons/play_arrow.svg';
import { ReactComponent as PauseIcon } from '../assets/icons/pause.svg';
import { ReactComponent as MoreVertSVG } from '../assets/icons/more_vert.svg';

import { RootState } from '../store/reducers';
import { TelemetryItem } from '../store/types';
import { validateInt } from '../components/inputs/validation';
import { DEFAULT_OPTIONS } from './Graph';

import useRefCallback from '../hooks/useRefCallback';
import useOpModeLifecycle from '../hooks/useOpModeLifecycle';
import useOnClickOutside from '../hooks/useOnClickOutside';

type GraphViewProps = BaseViewProps & BaseViewHeadingProps;

type Key = {
  name: string;
  hasNumeric: boolean;
  isSelected: boolean;
};

type KeyReducerAction =
  | { type: 'SET'; payload: Key[] }
  | { type: 'APPEND'; payload: TelemetryItem }
  | { type: 'SET_SELECTED'; payload: { index: number; value: boolean } };

const keyReducer = (state: Key[], action: KeyReducerAction): Key[] => {
  switch (action.type) {
    case 'SET': {
      return action.payload;
    }
    case 'APPEND': {
      const stateCopy = [...state];
      const { data } = action.payload;

      for (const [key, value] of Object.entries(data)) {
        const valueIsNumeric = !isNaN(parseFloat(value));

        if (!stateCopy.map((e) => e.name).includes(key)) {
          stateCopy.push({
            name: key,
            hasNumeric: valueIsNumeric,
            isSelected: false,
          });
        } else if (!stateCopy.find((e) => e.name === key)?.hasNumeric) {
          const currentItem = stateCopy.find((e) => e.name === key);
          if (currentItem) currentItem.hasNumeric = valueIsNumeric;
        }
      }

      return stateCopy;
    }
    case 'SET_SELECTED': {
      const stateCopy = [...state];
      stateCopy[action.payload.index].isSelected = action.payload.value;

      return stateCopy;
    }
  }
};

const MenuItemSwitch = ({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange:
    | ((checked: boolean) => void)
    | (FormEventHandler<HTMLButtonElement> & ((checked: boolean) => void));
  children: JSX.Element | string;
}) => (
  <Switch.Group as="div" className="flex items-center space-x-4">
    <Switch
      as="button"
      checked={checked}
      onChange={onChange}
      className={`${
        checked ? 'bg-indigo-600' : 'bg-gray-200'
      } relative inline-flex flex-shrink-0 h-4 transition-colors duration-200 ease-in-out border-2 border-transparent rounded-full cursor-pointer w-7 focus:outline-none focus:shadow-outline`}
    >
      {({ checked }) => (
        <span
          className={`${
            checked ? 'translate-x-3' : 'translate-x-0'
          } inline-block w-3 h-3 transition duration-200 ease-in-out transform bg-white rounded-full`}
        />
      )}
    </Switch>
    <Switch.Label className="ml-2">{children}</Switch.Label>
  </Switch.Group>
);

const GraphView = ({
  isDraggable = false,
  isUnlocked = false,
}: GraphViewProps) => {
  const telemetry = useSelector((state: RootState) => state.telemetry);

  const graphRef = useRef<GraphCanvas>(null);

  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMenuShowing, setIsMenuShowing] = useState(false);

  const [isPaused, setIsPaused] = useState(false);

  const [keys, dispatchKeys] = useReducer(keyReducer, []);

  const [windowMs, setWindowMs] = useState({
    value: DEFAULT_OPTIONS.windowMs,
    valid: true,
  });

  const lastHighestTimestamp = useRef<number>(-1);

  const handleDocumentKeydown = (evt: KeyboardEvent) => {
    if (evt.code === 'Space' || evt.key === 'k') {
      setIsPaused(!isPaused);
    }
  };

  const [, containerRef] = useRefCallback<HTMLDivElement | null>(null, {
    mountHook: (node) =>
      node?.addEventListener('keydown', handleDocumentKeydown),
    cleanupHook: (node) =>
      node?.removeEventListener('keydown', handleDocumentKeydown),
  });

  useEffect(() => {
    if (telemetry.length === 1 && telemetry[0].timestamp === 0) return;

    telemetry.forEach((e) => {
      dispatchKeys({ type: 'APPEND', payload: e });
    });
  }, [telemetry]);

  // TODO: Use currentState to cache selected values if opmode hasn't changed
  const { currentState } = useOpModeLifecycle({
    INIT: {
      onEnter: () => {
        dispatchKeys({ type: 'SET', payload: [] });
        lastHighestTimestamp.current = -1;
      },
    },
  });

  useOnClickOutside(
    menuRef,
    () => {
      if (isMenuShowing) setIsMenuShowing(false);
    },
    [menuBtnRef],
  );

  const play = () => setIsPaused(false);
  const pause = () => setIsPaused(true);

  const graphSamples = telemetry
    .filter((e) => e.timestamp > lastHighestTimestamp.current)
    .map(({ timestamp, data }) => ({
      timestamp,
      data: Object.keys(data)
        .filter((key) =>
          keys
            .filter((e) => e.isSelected)
            .map((e) => e.name)
            .includes(key),
        )
        .map((key) => [key, parseFloat(data[key])]),
    }));

  lastHighestTimestamp.current = Math.max(...telemetry.map((e) => e.timestamp));

  const errorFlow = () => {
    if (keys.length === 0 || !keys.every((e) => e.hasNumeric)) {
      return (
        <p className="justify-self-center text-center">
          Send number-valued telemetry data to graph them over time
        </p>
      );
    } else if (keys.every((e) => !e.isSelected)) {
      return (
        <div className="justify-self-center text-center">
          <p>Select telemetry to graph</p>
          <p className="text-neutral-gray-500">
            (via the dropdown in the top right)
          </p>
        </div>
      );
    }

    return (
      <GraphCanvas
        ref={graphRef}
        samples={graphSamples}
        options={{
          windowMs: windowMs.valid ? windowMs.value : DEFAULT_OPTIONS.windowMs,
        }}
        paused={isPaused || currentState === 'STOPPED'}
      />
    );
  };

  return (
    <BaseView
      className="flex flex-col overflow-auto"
      isUnlocked={isUnlocked}
      ref={containerRef}
      tabIndex={0}
    >
      <div className="flex">
        <BaseViewHeading isDraggable={isDraggable}>Graph</BaseViewHeading>
        <BaseViewIcons>
          <Transition
            show={keys.length !== 0 && keys.some((e) => e.isSelected)}
            enter="transition-opacity duration-100"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <BaseViewIconButton>
              {isPaused ? (
                <PlayIcon className="w-6 h-6" onClick={play} />
              ) : (
                <PauseIcon className="w-6 h-6" onClick={pause} />
              )}
            </BaseViewIconButton>
          </Transition>
          <div className="relative inline-block">
            <BaseViewIconButton
              ref={menuBtnRef}
              onClick={() => setIsMenuShowing(!isMenuShowing)}
            >
              <MoreVertSVG className="w-6 h-6" />
            </BaseViewIconButton>
            <Transition
              show={isMenuShowing}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0"
              enterTo="transform opacity-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <div
                ref={menuRef}
                className="absolute right-0 mt-2 py-2 origin-top-right bg-white border border-gray-200 rounded-md shadow-lg outline-none"
                style={{ zIndex: 99 }}
              >
                <p className="text-sm leading-5 border-b border-gray-100 pb-1 mb-1 mx-3 text-gray-500">
                  Toggle Items
                </p>
                <div className="mb-3 mt-2 mx-3">
                  {keys
                    .filter((e) => e.hasNumeric)
                    .map((e, i) => (
                      <MenuItemSwitch
                        key={e.name}
                        checked={e.isSelected}
                        onChange={(checked) =>
                          dispatchKeys({
                            type: 'SET_SELECTED',
                            payload: { index: i, value: checked },
                          })
                        }
                      >
                        {e.name}
                      </MenuItemSwitch>
                    ))}
                </div>
                {keys.length === 0 && (
                  <p className="text-sm mx-3 mt-3 mb-4 leading-4 text-center">
                    No number-value received
                  </p>
                )}
                <div className="text-sm mx-3">Window (ms):</div>
                <TextInput
                  className="text-sm mx-3"
                  value={windowMs.value}
                  valid={windowMs.valid}
                  validate={validateInt}
                  onChange={({
                    value,
                    valid,
                  }: {
                    value: number;
                    valid: boolean;
                  }) =>
                    setWindowMs({
                      value,
                      valid,
                    })
                  }
                />
                <div className="w-full flex justify-center border-t border-gray-100 mt-2">
                  <button
                    onClick={() => graphRef.current?.clearGraph()}
                    className="text-sm bg-purple-200 border border-purple-300 rounded mt-2 px-2 py-1"
                  >
                    Clear Graph
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </BaseViewIcons>
      </div>
      <BaseViewBody className="flex-center">{errorFlow()}</BaseViewBody>
    </BaseView>
  );
};

export default GraphView;
