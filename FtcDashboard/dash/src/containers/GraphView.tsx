import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  FormEventHandler,
} from 'react';
import { useSelector } from 'react-redux';
import { useCallbackRef } from 'use-callback-ref';

import { Transition, Switch } from '@headlessui/react';

import BaseView, {
  BaseViewHeading,
  BaseViewBody,
  BaseViewIcons,
  BaseViewIconButton,
  BaseViewProps,
  BaseViewHeadingProps,
} from './BaseView';
import TextInput from '../components/inputs/TextInput';
import AutoFitCanvas from '../components/AutoFitCanvas';

import { ReactComponent as PlayIcon } from '../assets/icons/play_arrow.svg';
import { ReactComponent as PauseIcon } from '../assets/icons/pause.svg';
import { ReactComponent as MoreVertSVG } from '../assets/icons/more_vert.svg';

import Graph from './Graph';
import { RootState } from '../store/reducers';
import { validateInt } from '../components/inputs/validation';
import { DEFAULT_OPTIONS } from './Graph';
import { Sample } from './Graph';

import useOpModeLifecycle from '../hooks/useOpModeLifecycle';
import useTelemetryStore from '../hooks/useTelemetryStore';
import useOnClickOutside from '../hooks/useOnClickOutside';

type GraphViewProps = BaseViewProps & BaseViewHeadingProps;

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
  const { store, dispatch } = useTelemetryStore<{
    isSelected: boolean;
    hasNumeric: boolean;
  }>({ isSelected: false, hasNumeric: false });
  const { keys, keyMeta } = store;

  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMenuShowing, setIsMenuShowing] = useState(false);

  const [isPaused, setIsPaused] = useState(false);

  const [windowMs, setWindowMs] = useState({
    value: DEFAULT_OPTIONS.windowMs,
    valid: true,
  });

  const graphRef = useRef<Graph | null>();
  const canvasRef = useCallbackRef<HTMLCanvasElement | null>(null, (node) => {
    if (node) {
      graphRef.current = new Graph(node, {
        windowMs: windowMs.valid ? windowMs.value : DEFAULT_OPTIONS.windowMs,
      });
    }
  });
  const reqAnimFrameIdRef = useRef<number | null>(null);
  const sampleQueue = useRef<Sample[][]>([]);

  const handleDocumentKeydown = (evt: KeyboardEvent) => {
    if (evt.code === 'Space' || evt.key === 'k') {
      setIsPaused((paused) => !paused);
    }
  };

  const containerRef = useCallbackRef<HTMLDivElement | null>(
    null,
    (newNode, lastNode) => {
      if (newNode) newNode.addEventListener('keydown', handleDocumentKeydown);
      if (lastNode)
        lastNode.removeEventListener('keydown', handleDocumentKeydown);
    },
  );

  // TODO: Use currentState to cache selected values if opmode hasn't changed
  const { currentState } = useOpModeLifecycle({
    INIT: {
      onEnter: () => {
        graphRef.current?.setFrozen(false);
        setIsPaused(false);
      },
    },
    RUNNING: {
      onEnter: () => {
        graphRef.current?.setFrozen(false);
        setIsPaused(false);
      },
    },
    STOPPED: {
      onEnter: () => {
        graphRef.current?.setFrozen(true);
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

  useEffect(() => {
    telemetry.forEach((e) => {
      Object.entries(e.data).forEach(([key, value]) => {
        const index = keys.indexOf(key);

        if (index !== -1) {
          const metaVal = keyMeta[index];

          if (!metaVal.hasNumeric && !isNaN(parseFloat(value))) {
            dispatch({
              type: 'SET_KEY_META',
              payload: {
                index,
                value: { ...metaVal, hasNumeric: true },
              },
            });
          }
        }
      });
    });
  }, [dispatch, keyMeta, keys, telemetry]);

  useEffect(() => {
    const graphSamples = telemetry.map(({ timestamp, data }) => ({
      timestamp,
      data: Object.keys(data)
        .filter((key) =>
          keys.filter((_, i) => keyMeta[i].isSelected).includes(key),
        )
        .map((key) => [key, parseFloat(data[key])] as [string, number]),
    }));

    sampleQueue.current.push(graphSamples);
  }, [keyMeta, keys, telemetry]);

  // useEffect(() => {
  //   if (canvasRef.current) {
  //     graphRef.current = new Graph(canvasRef.current, {
  //       windowMs: windowMs.valid ? windowMs.value : DEFAULT_OPTIONS.windowMs,
  //     });
  //     console.log('reconstruct graph');
  //   }
  // }, [windowMs]);

  const animationFrame = useCallback(() => {
    sampleQueue.current.forEach((e) => graphRef.current?.addSamples(e));
    sampleQueue.current = [];

    if (!isPaused) graphRef.current?.render();

    // TODO: Cancel animation when not necessary
    reqAnimFrameIdRef.current = requestAnimationFrame(animationFrame);
  }, [isPaused]);

  useEffect(() => {
    reqAnimFrameIdRef.current = requestAnimationFrame(animationFrame);

    return () => {
      if (reqAnimFrameIdRef.current)
        cancelAnimationFrame(reqAnimFrameIdRef.current);
    };
  }, [animationFrame]);

  const errorFlow = () => {
    if (keys.length === 0 || !keys.every((_, i) => keyMeta[i].hasNumeric)) {
      return (
        <p className="justify-self-center text-center">
          Send number-valued telemetry data to graph them over time
        </p>
      );
    } else if (keys.every((_, i) => !keyMeta[i].isSelected)) {
      return (
        <div className="justify-self-center text-center">
          <p>Select telemetry to graph</p>
          <p className="text-neutral-gray-500">
            (via the dropdown in the top right)
          </p>
        </div>
      );
    }

    return <AutoFitCanvas ref={canvasRef} />;
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
            show={
              keys.length !== 0 &&
              currentState !== 'STOPPED' &&
              keys.some((_, i) => keyMeta[i].isSelected)
            }
            enter="transition-opacity duration-100"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <BaseViewIconButton
              onClick={() => setIsPaused((paused) => !paused)}
            >
              {isPaused ? (
                <PlayIcon className="w-6 h-6" />
              ) : (
                <PauseIcon className="w-6 h-6" />
              )}
            </BaseViewIconButton>
          </Transition>
          <div className="relative inline-block">
            <BaseViewIconButton
              ref={menuBtnRef}
              onClick={() => setIsMenuShowing((showing) => !showing)}
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
                    .filter((_, i) => keyMeta[i].hasNumeric)
                    .map((e, i) => (
                      <MenuItemSwitch
                        key={e}
                        checked={keyMeta[i].isSelected}
                        onChange={(checked) =>
                          dispatch({
                            type: 'SET_KEY_META',
                            payload: {
                              index: i,
                              value: { ...keyMeta[i], isSelected: checked },
                            },
                          })
                        }
                      >
                        {e}
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
                    onClick={() => graphRef.current?.clear()}
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
