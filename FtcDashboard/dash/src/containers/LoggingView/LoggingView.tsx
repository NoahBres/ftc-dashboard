import { useState, useEffect, useRef, FunctionComponent } from 'react';
import { connect } from 'react-redux';

import { v4 as uuid4 } from 'uuid';

import BaseView, {
  BaseViewProps,
  BaseViewHeading,
  BaseViewBody,
  BaseViewHeadingProps,
} from '../BaseView';
import { STOP_OP_MODE_TAG, Telemetry } from '../types';
import OpModeStatus from '../../enums/OpModeStatus';

import CustomVirtualList from './CustomVirtualList';
import { DateToHHMMSS } from './DateFormatting';
import useDelayedTooltip, { ToolTip } from '../../hooks/useDelayedTooltip';

import useBuildListWorker from './useBuildListWorker';
import useCancellablePromise from '../../hooks/useCancellablePromise';

import { ReactComponent as DownloadSVG } from '../../assets/icons/file_download.svg';
import { ReactComponent as DownloadOffSVG } from '../../assets/icons/file_download_off.svg';
import { ReactComponent as LoopSVG } from '../../assets/icons/autorenew.svg';

type LoggingViewProps = {
  telemetry?: Telemetry;
  activeOpMode?: string;
  activeOpModeStatus?: OpModeStatus;
  opModeList?: string[];
} & BaseViewProps &
  BaseViewHeadingProps;

export interface TelemetryStoreItem {
  timestamp: number;
  data: TelemetryField[];
}

interface TelemetryField {
  tag: string;
  data: string;
}

interface SelectedTag {
  tag: string;
  isChecked: boolean;
  id: string;
}

export interface LogItem {
  timestamp: number;
  tag: string;
  data: string;
}

const PILL_COLORS = [
  'bg-blue-500 border-blue-600 focus-within:ring-blue-600',
  'bg-purple-500 border-purple-600 focus-within:ring-purple-600',
  'bg-pink-500 border-pink-600 focus-within:ring-pink-600',
  'bg-red-500 border-red-600 focus-within:ring-red-600',
  'bg-orange-500 border-orange-600 focus-within:ring-orange-600',
  'bg-green-500 border-green-600 focus-within:ring-green-600',
];

const LoggingView: FunctionComponent<LoggingViewProps> = ({
  telemetry,
  activeOpMode,
  activeOpModeStatus,
  opModeList,

  isDraggable = false,
  isUnlocked = false,
}: LoggingViewProps) => {
  const storedTags = useRef<string[]>([]);

  const [telemetryStore, setTelemetryStore] = useState<TelemetryStoreItem[]>(
    [],
  );
  const [isRecording, setIsRecording] = useState(false);
  const [selectedTags, setSelectedTags] = useState<SelectedTag[]>([]);

  const [filteredLogs, setFilteredLogs] = useState<LogItem[]>([]);

  const [isDownloadable, setIsDownloadable] = useState(false);
  const [currentOpModeName, setCurrentOpModeName] = useState('');

  const [isPromiseLoading, setIsPromiseLoading] = useState(false);
  const { newCancellablePromise, cancelAllPromises } = useCancellablePromise();

  const {
    isShowingTooltip: isShowingDownloadTooltip,
    ref: downloadRef,
  } = useDelayedTooltip(0.5);

  const buildList = useBuildListWorker();

  const clearPastTelemetry = () => {
    storedTags.current = [];

    setTelemetryStore([]);
    setSelectedTags([]);
    setFilteredLogs([]);
  };

  useEffect(() => {
    if (isRecording) {
      const newKeys: string[] = [];
      const newLog: LogItem[] = [];
      const newTelemetryStoreItems: TelemetryStoreItem[] = [];

      telemetry?.forEach((e) => {
        const newTelemetryStoreChunk: TelemetryField[] = [];

        for (const [key, value] of Object.entries(e.data)) {
          if (!storedTags.current.includes(key)) {
            newKeys.push(key);
            storedTags.current.push(key);
          }

          newTelemetryStoreChunk.push({ tag: key, data: value });

          // Ingest into filtered logs
          if (
            selectedTags
              .filter((e) => e.isChecked)
              .map((e) => e.tag)
              .includes(key)
          ) {
            newLog.push({ timestamp: e.timestamp, data: value, tag: key });
          }
        }

        if (newTelemetryStoreChunk.length !== 0) {
          newTelemetryStoreItems.push({
            timestamp: e.timestamp,
            data: newTelemetryStoreChunk,
          });
        }
      });

      if (newTelemetryStoreItems.length !== 0) {
        setTelemetryStore([...telemetryStore, ...newTelemetryStoreItems]);
      }
      if (newKeys.length !== 0) {
        setSelectedTags([
          ...selectedTags,
          ...newKeys.map((e) => ({ tag: e, isChecked: false, id: uuid4() })),
        ]);
      }
      if (newLog.length !== 0) {
        setFilteredLogs([...filteredLogs, ...newLog]);
      }
    } else {
      setIsRecording(true);
      clearPastTelemetry();
    }

    // Only want this effect to run on new telemetry
    // So no dependcies on the rest of the states
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telemetry]);

  useEffect(() => {
    if (opModeList?.length === 0) {
      setIsRecording(false);
    } else if (activeOpMode === STOP_OP_MODE_TAG) {
      setIsRecording(false);
    } else if (activeOpModeStatus === OpModeStatus.RUNNING) {
      if (!isRecording) {
        setIsRecording(true);
        clearPastTelemetry();
      }
    } else if (activeOpModeStatus === OpModeStatus.STOPPED) {
      setIsRecording(false);
    }
  }, [activeOpMode, activeOpModeStatus, isRecording, opModeList]);

  useEffect(() => {
    if (activeOpModeStatus === OpModeStatus.RUNNING) {
      setCurrentOpModeName(activeOpMode ?? '');
    }
  }, [activeOpMode, activeOpModeStatus]);

  useEffect(() => {
    if (
      !isRecording &&
      telemetryStore.length !== 0 &&
      !selectedTags.every((e) => !e.isChecked)
    ) {
      setIsDownloadable(true);
    } else {
      setIsDownloadable(false);
    }
  }, [isRecording, selectedTags, telemetryStore.length]);

  useEffect(() => {
    setIsPromiseLoading(false);
  }, [filteredLogs]);

  const tagPillOnChange = (id: string) => {
    // We choose not to update the filtered logs after the logs reach this
    // value while the telemetry is live. Reconstructing the past logs is
    // fairly intensive when the logs get very long and introduces a delay
    const CLEAR_THRESHOLD = 2000;

    const tagsSelectedCopy = [...selectedTags];
    const targetIndex = tagsSelectedCopy.findIndex((e) => e.id === id);
    if (targetIndex !== -1) {
      tagsSelectedCopy[targetIndex].isChecked = !tagsSelectedCopy[targetIndex]
        .isChecked;

      setSelectedTags(tagsSelectedCopy);

      if (
        !(
          activeOpModeStatus === OpModeStatus.RUNNING &&
          telemetryStore.length > CLEAR_THRESHOLD
        )
      ) {
        updateFilteredLogs();
      }
    }
  };

  const updateFilteredLogs = () => {
    // Threshold at which we switch switch to async filtering and
    // offload the process of rebuilding the log into a worker
    // because it's fairly intensive and halts the ui
    const ASYNC_FILTERED_THRESHOLD = 20000;

    if (
      activeOpModeStatus !== OpModeStatus.RUNNING &&
      telemetryStore.length > ASYNC_FILTERED_THRESHOLD
    ) {
      setIsPromiseLoading(true);
      cancelAllPromises();
      newCancellablePromise(
        buildList.buildList(
          telemetryStore,
          selectedTags.filter((e) => e.isChecked).map((e) => e.tag),
        ),
      )
        .then((result: any) => setFilteredLogs(result as LogItem[]))
        .catch((e) => console.log(e));
    } else {
      const newFilteredLogs = telemetryStore.reduce((acc, curr) => {
        const newLogs = curr.data
          .filter((e) =>
            selectedTags
              .filter((e) => e.isChecked)
              .map((e) => e.tag)
              .includes(e.tag),
          )
          .map((e) => ({
            timestamp: curr.timestamp,
            tag: e.tag,
            data: e.data,
          }));

        return [...acc, ...newLogs];
      }, [] as LogItem[]);
      setFilteredLogs(newFilteredLogs);
    }
  };

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

    const tags = [
      'timestamp',
      ...selectedTags.filter((e) => e.isChecked).map((e) => e.tag),
    ];

    const telemetryStoreCopy = [...telemetryStore];

    telemetryStoreCopy.sort((a, b) => a.timestamp - b.timestamp);

    const firstRow = tags.join(',');
    const body = telemetryStoreCopy
      .map((e) => {
        const newRow = tags.map((tag, i) => {
          if (i === 0) return DateToHHMMSS(new Date(e.timestamp));

          return e.data.find((data) => data.tag === tag)?.data || '';
        });

        return newRow.join(',');
      })
      .join('\r\n');
    const csv = `${firstRow}\r\n${body}`;

    const fileDate = new Date(telemetryStoreCopy[0].timestamp);
    const year = fileDate.getFullYear();
    const month = `0${fileDate.getMonth()}`.slice(-2);
    const date = `0${fileDate.getDay()}`.slice(-2);

    const hourlyDate = DateToHHMMSS(fileDate)
      .replaceAll(':', '_')
      .split('.')[0];

    downloadBlob(
      csv,
      `${currentOpModeName} ${year}-${month}-${date} ${hourlyDate}.csv`,
      'text/csv',
    );
  };

  const getToolTipError = () => {
    if (
      telemetryStore.length === 0 &&
      activeOpModeStatus !== OpModeStatus.RUNNING
    ) {
      return 'No logs to download';
    } else if (activeOpModeStatus === OpModeStatus.RUNNING) {
      return 'Cannot download logs while OpMode is running';
    } else if (selectedTags.every((e) => !e.isChecked)) {
      return 'Select the tags you would like in your CSV download';
    }

    return `Download logs for ${currentOpModeName}`;
  };

  const ErrorMessageFlow = () => {
    if (
      telemetryStore.length === 0 &&
      activeOpModeStatus !== OpModeStatus.RUNNING
    ) {
      return (
        <div className="w-full h-full flex-center flex-col">
          <p className="text-center">No logs recorded</p>
          <p className="text-center">
            Logs will be recorded as an opmode starts streaming tagged telemetry
            data
          </p>
        </div>
      );
    } else if (storedTags.current.length === 0) {
      return (
        <div className="w-full h-full flex-center flex-col">
          <p className="text-center">Tagged telemetry not yet sent</p>
        </div>
      );
    } else if (selectedTags.every((e) => !e.isChecked)) {
      return (
        <div className="w-full h-full flex-center flex-col">
          <p className="text-center">Select tags to display relevant logs</p>
        </div>
      );
    } else if (isPromiseLoading) {
      return (
        <div className="w-full h-full flex-center space-x-2">
          <LoopSVG className="animate-spin" />
          <p className="text-center">Rebuilding logs...</p>
        </div>
      );
    }

    return (
      <CustomVirtualList
        itemCount={filteredLogs.length}
        itemData={filteredLogs}
      />
    );
  };

  return (
    <BaseView
      className="flex flex-col"
      isUnlocked={isUnlocked}
      style={{ paddingLeft: '0' }}
    >
      <div className="flex-center">
        <BaseViewHeading className="pl-4" isDraggable={isDraggable}>
          Logging View
        </BaseViewHeading>
        <div className="flex items-center mr-3 space-x-1">
          <button
            className={`icon-btn w-8 h-8 relative ${
              isDownloadable ? '' : 'border-gray-400'
            }`}
            onClick={downloadCSV}
            ref={downloadRef}
          >
            {isDownloadable ? (
              <DownloadSVG className="w-6 h-6" />
            ) : (
              <DownloadOffSVG className="w-6 h-6 text-neutral-gray-400" />
            )}
            <ToolTip isShowing={isShowingDownloadTooltip}>
              {getToolTipError()}
            </ToolTip>
          </button>
        </div>
      </div>
      <BaseViewBody>
        <div className="w-full px-2 py-2 pb-3 pl-3 space-x-2 overflow-x-auto whitespace-nowrap">
          {selectedTags.map((e, index) => (
            <button
              key={e.tag}
              className={`
                  inline-block rounded-full px-3 py-1 text-white text-sm cursor-pointer
                  select-none border ring ring-transparent transition outline-none focus:outline-none
                  ${PILL_COLORS[index % PILL_COLORS.length]}
                  ${e.isChecked ? 'shadow-md-prominent' : 'opacity-50'}
                `}
              onClick={() => tagPillOnChange(e.id)}
            >
              {e.tag}
            </button>
          ))}
        </div>
        <div
          className="pl-4 overflow-auto"
          style={{ height: 'calc(100% - 50px)' }}
        >
          {ErrorMessageFlow()}
        </div>
      </BaseViewBody>
    </BaseView>
  );
};

const mapStateToProps = ({
  telemetry,
  status,
}: {
  telemetry: Telemetry;
  status: any;
}) => ({
  telemetry,
  ...status,
});

export default connect(mapStateToProps)(LoggingView);
