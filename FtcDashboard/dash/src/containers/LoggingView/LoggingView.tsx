import React, { useState, useRef, FormEventHandler } from 'react';

import { Transition, Switch } from '@headlessui/react';

import BaseView, {
  BaseViewHeading,
  BaseViewBody,
  BaseViewIconButton,
  BaseViewProps,
  BaseViewHeadingProps,
} from '../BaseView';
import CustomVirtualGrid from './CustomVirtualGrid';
import { DateToHHMMSS } from '../../DateFormatting';
import ToolTip from '../../components/ToolTip';

import useDelayedTooltip from '../../hooks/useDelayedTooltip';
import useOnClickOutside from '../../hooks/useOnClickOutside';
import useOpModeLifecycle from '../../hooks/useOpModeLifecycle';
import useTelemetryStore from '../../hooks/useTelemetryStore';

import { ReactComponent as DownloadSVG } from '../../assets/icons/file_download.svg';
import { ReactComponent as DownloadOffSVG } from '../../assets/icons/file_download_off.svg';
import { ReactComponent as MoreVertSVG } from '../../assets/icons/more_vert.svg';

type LoggingViewProps = BaseViewProps & BaseViewHeadingProps;

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
  <Switch.Group as="div" className="flex items-center space-x-4 py-1 px-3">
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

const LoggingView = ({
  isDraggable = false,
  isUnlocked = false,
}: LoggingViewProps) => {
  const {
    store: telemetryStore,
    dispatch: dispatchTelemetryStore,
  } = useTelemetryStore<boolean>(true);

  const [isRecording, setIsRecording] = useState(false);
  const [lastOpModeName, setLastOpModeName] = useState('');

  const [isKeyShowingMenuVisible, setIsKeyShowingMenuVisible] = useState(false);
  const [isTimeShowing, setIsTimeShowing] = useState(true);

  const downloadButtonRef = useRef(null);
  const isShowingDownloadTooltip = useDelayedTooltip(0.5, downloadButtonRef);

  const keyShowingMenuRef = useRef(null);
  const keyShowingMenuButtonRef = useRef(null);

  const { currentState: opModeState } = useOpModeLifecycle({
    INIT: {
      onEnter: () => {
        setIsRecording(true);
      },
    },
    RUNNING: {
      onEnter: ({ newOpModeName }) => {
        setLastOpModeName(newOpModeName);
        setIsRecording(true);
      },
    },
    STOPPED: {
      onEnter: () => {
        setIsRecording(false);
      },
    },
  });

  useOnClickOutside(
    keyShowingMenuRef,
    () => {
      if (isKeyShowingMenuVisible) setIsKeyShowingMenuVisible(false);
    },
    [keyShowingMenuButtonRef],
  );

  const isDownloadable = !isRecording && telemetryStore.store.length !== 0;

  const downloadCSV = () => {
    if (!isDownloadable) return;

    function downloadBlob(data: string, fileName: string, mime: string) {
      const a = document.createElement('a');
      a.style.display = 'none';
      document.body.appendChild(a);

      const blob = new Blob([data], { type: mime });
      const url = window.URL.createObjectURL(blob);

      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    }

    const storeCopy = [...telemetryStore.store];
    storeCopy.sort((a, b) => a.timestamp - b.timestamp);

    const firstRow = ['time', ...telemetryStore.keys, 'logs'];
    const body = storeCopy
      .map(
        (e) =>
          `${DateToHHMMSS(new Date(e.timestamp))},${[
            ...e.data,
            ...new Array(telemetryStore.keys.length - e.data.length),
          ].join(',')},"${e.log.join('\n')}"`,
      )
      .join('\r\n');
    const csv = `${firstRow}\r\n${body}`;

    const fileDate = new Date(storeCopy[0].timestamp);
    const year = fileDate.getFullYear();
    const month = `0${fileDate.getMonth()}`.slice(-2);
    const date = `0${fileDate.getDay()}`.slice(-2);

    const hourlyDate = DateToHHMMSS(fileDate)
      .replaceAll(':', '_')
      .split('.')[0];

    downloadBlob(
      csv,
      `${lastOpModeName} ${year}-${month}-${date} ${hourlyDate}.csv`,
      'text/csv',
    );
  };

  const getToolTipError = () => {
    if (telemetryStore.store.length === 0 && opModeState !== 'RUNNING') {
      return 'No logs to download';
    } else if (opModeState === 'RUNNING') {
      return 'Cannot download logs while OpMode is running';
    }

    return `Download logs for ${lastOpModeName}`;
  };

  return (
    <BaseView isUnlocked={isUnlocked}>
      <div className="flex-center">
        <BaseViewHeading isDraggable={isDraggable}>Logging</BaseViewHeading>
        <div className="flex items-center mr-3 space-x-1">
          <BaseViewIconButton
            className={`${isDownloadable ? '' : 'border-gray-400'}`}
            onClick={downloadCSV}
            ref={downloadButtonRef}
          >
            {isDownloadable ? (
              <DownloadSVG className="w-6 h-6" />
            ) : (
              <DownloadOffSVG className="w-6 h-6 text-neutral-gray-400" />
            )}
            <ToolTip
              hoverRef={downloadButtonRef}
              isShowing={isShowingDownloadTooltip}
            >
              {getToolTipError()}
            </ToolTip>
          </BaseViewIconButton>
          <div className="relative inline-block">
            <BaseViewIconButton
              ref={keyShowingMenuButtonRef}
              onClick={() =>
                setIsKeyShowingMenuVisible(!isKeyShowingMenuVisible)
              }
            >
              <MoreVertSVG className="w-6 h-6" />
            </BaseViewIconButton>
            <Transition
              show={isKeyShowingMenuVisible}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <div
                ref={keyShowingMenuRef}
                className="absolute right-0 mt-2 py-2 origin-top-right bg-white border border-gray-200 rounded-md shadow-lg outline-none"
                style={{ zIndex: 99 }}
              >
                <p className="text-sm leading-5 border-b border-gray-100 pl-3 pb-1 mb-1 text-gray-500">
                  Toggle Items
                </p>
                <MenuItemSwitch
                  checked={isTimeShowing}
                  onChange={setIsTimeShowing}
                >
                  Time
                </MenuItemSwitch>
                {telemetryStore.keys.map((e, i) => (
                  <MenuItemSwitch
                    key={e}
                    checked={telemetryStore.keyMeta[i]}
                    onChange={(checked) =>
                      dispatchTelemetryStore({
                        type: 'SET_KEY_META',
                        payload: {
                          index: i,
                          value: checked,
                        },
                      })
                    }
                  >
                    {e}
                  </MenuItemSwitch>
                ))}
              </div>
            </Transition>
          </div>
        </div>
      </div>
      <BaseViewBody>
        <CustomVirtualGrid
          header={
            telemetryStore.keys.length !== 0
              ? ['Time', ...telemetryStore.keys]
              : []
          }
          data={telemetryStore.raw}
          columnsShowing={[isTimeShowing, ...telemetryStore.keyMeta]}
        />
      </BaseViewBody>
    </BaseView>
  );
};

export default LoggingView;
