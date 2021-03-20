import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import BaseView, {
  BaseViewHeading,
  BaseViewBody,
  BaseViewIcons,
  BaseViewIconButton,
  BaseViewProps,
  BaseViewHeadingProps,
} from './BaseView';
import MultipleCheckbox from '../components/MultipleCheckbox';
import GraphCanvas from './GraphCanvas';
import TextInput from '../components/inputs/TextInput';

import { ReactComponent as ChartIcon } from '../assets/icons/chart.svg';
import { ReactComponent as CloseIcon } from '../assets/icons/close.svg';
import { ReactComponent as PlayIcon } from '../assets/icons/play_arrow.svg';
import { ReactComponent as PauseIcon } from '../assets/icons/pause.svg';

import { RootState } from '../store/reducers';
import { validateInt } from '../components/inputs/validation';
import { DEFAULT_OPTIONS } from './Graph';

import useRefCallback from '../hooks/useRefCallback';

type GraphViewProps = BaseViewProps & BaseViewHeadingProps;

const GraphView = ({
  isDraggable = false,
  isUnlocked = false,
}: GraphViewProps) => {
  const telemetry = useSelector((state: RootState) => state.telemetry);

  const [isGraphing, setIsGraphing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [keys, setKeys] = useState<string[]>([]);

  const [windowMs, setWindowMs] = useState({
    value: DEFAULT_OPTIONS.windowMs,
    valid: true,
  });

  const handleDocumentKeydown = (evt: KeyboardEvent) => {
    if (evt.code === 'Space' || evt.key === 'k') {
      setIsPaused(!isPaused);
    }
  };

  const [, setContainerRef] = useRefCallback<HTMLDivElement | null>(null, {
    mountHook: (node) =>
      node?.addEventListener('keydown', handleDocumentKeydown),
    cleanupHook: (node) =>
      node?.removeEventListener('keydown', handleDocumentKeydown),
  });

  const play = () => setIsPaused(false);
  const pause = () => setIsPaused(true);

  const start = () => {
    setIsGraphing(true);
    setIsPaused(false);
  };

  const stop = () => setIsGraphing(false);

  const latestPacket = telemetry[telemetry.length - 1];

  const numericKeys = Object.keys(latestPacket.data).filter(
    (key) => !isNaN(parseFloat(latestPacket.data[key])),
  );
  const showNoNumeric = !isGraphing && numericKeys.length === 0;
  const showEmpty = isGraphing && keys.length === 0;
  const showText = showNoNumeric || showEmpty;

  const graphSamples = telemetry.map(({ timestamp, data }) => ({
    timestamp,
    data: Object.keys(data)
      .filter((key) => keys.includes(key))
      .map((key) => [key, parseFloat(data[key])]),
  }));

  return (
    <BaseView
      className="flex flex-col overflow-auto"
      isUnlocked={isUnlocked}
      ref={setContainerRef}
      tabIndex={0}
    >
      <div className="flex">
        <BaseViewHeading isDraggable={isDraggable}>Graph</BaseViewHeading>
        <BaseViewIcons>
          {isGraphing && keys.length !== 0 && (
            <BaseViewIconButton className="w-8 h-8 icon-btn">
              {isPaused ? (
                <PlayIcon className="w-6 h-6" onClick={play} />
              ) : (
                <PauseIcon className="w-6 h-6" onClick={pause} />
              )}
            </BaseViewIconButton>
          )}

          <BaseViewIconButton>
            {isGraphing ? (
              <CloseIcon className="w-6 h-6 text-black" onClick={stop} />
            ) : (
              <ChartIcon className="w-6 h-6" onClick={start} />
            )}
          </BaseViewIconButton>
        </BaseViewIcons>
      </div>
      <BaseViewBody className={showText ? 'flex-center' : ''}>
        {!isGraphing ? (
          showNoNumeric ? (
            <p className="justify-self-center text-center">
              Send number-valued telemetry data to graph them over time
            </p>
          ) : (
            <>
              <p className="my-2 text-center">
                Press the upper-right button to graph selected keys over time
              </p>
              <h3 className="mt-6 font-medium">Telemetry to graph:</h3>
              <div className="ml-3">
                <MultipleCheckbox
                  arr={numericKeys}
                  onChange={(selected: string[]) => setKeys(selected)}
                  selected={keys}
                />
              </div>
              <div className="mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Options:</h3>
                </div>
                <div className="ml-3">
                  <table>
                    <tbody>
                      <tr>
                        <td>Window (ms)</td>
                        <td>
                          <TextInput
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
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )
        ) : showEmpty ? (
          <p className="justify-self-center text-center">
            No telemetry selected to graph
          </p>
        ) : (
          <GraphCanvas
            samples={graphSamples}
            options={{
              windowMs: windowMs.valid
                ? windowMs.value
                : DEFAULT_OPTIONS.windowMs,
            }}
            paused={isPaused}
          />
        )}
      </BaseViewBody>
    </BaseView>
  );
};

export default GraphView;
