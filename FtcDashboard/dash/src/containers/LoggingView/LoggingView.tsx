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

import { ReactComponent as DownloadSVG } from '../../assets/icons/file_download.svg';
import { ReactComponent as DownloadOffSVG } from '../../assets/icons/file_download_off.svg';

type LoggingViewProps = {
  telemetry?: Telemetry;
  activeOpMode?: string;
  activeOpModeStatus?: OpModeStatus;
  opModeList?: string[];
} & BaseViewProps &
  BaseViewHeadingProps;

interface TelemetryStoreItem {
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
  'bg-red-500 border-red-600 focus-within:ring-red-600',
  'bg-orange-500 border-orange-600 focus-within:ring-orange-600',
  'bg-green-500 border-green-600 focus-within:ring-green-600',
  'bg-blue-500 border-blue-600 focus-within:ring-blue-600',
  'bg-purple-500 border-purple-600 focus-within:ring-purple-600',
  'bg-pink-500 border-pink-600 focus-within:ring-pink-600',
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
  const [tagsSelected, setTagsSelected] = useState<SelectedTag[]>([]);

  const [filteredLogs, setFilteredLogs] = useState<LogItem[]>([]);

  const [isDownloadable, setIsDownloadable] = useState(false);

  const clearPastTelemetry = () => {
    storedTags.current = [];

    setTelemetryStore([]);
    setTagsSelected([]);
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
            tagsSelected
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
        setTagsSelected([
          ...tagsSelected,
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

  // useEffect(() => {
  //   if (isRecording) clearPastTelemetry();
  // }, [isRecording]);

  useEffect(() => {
    if (!isRecording && telemetryStore.length !== 0) {
      setIsDownloadable(true);
    } else {
      setIsDownloadable(false);
    }
  }, [isRecording, telemetryStore.length]);

  const tagPillOnChange = (id: string) => {
    const tagsSelectedCopy = [...tagsSelected];
    const targetIndex = tagsSelectedCopy.findIndex((e) => e.id === id);
    if (targetIndex !== -1) {
      tagsSelectedCopy[targetIndex].isChecked = !tagsSelectedCopy[targetIndex]
        .isChecked;

      setTagsSelected(tagsSelectedCopy);
      updateFilteredLogs();
    }
  };

  const updateFilteredLogs = () => {
    const newFilteredLogs = telemetryStore.reduce((acc, curr) => {
      const newLogs = curr.data
        .filter((e) =>
          tagsSelected
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
            className={`icon-btn w-8 h-8 ${
              isDownloadable ? '' : 'pointer-events-none opacity-50'
            }`}
            disabled={!isDownloadable}
          >
            {isDownloadable ? (
              <DownloadSVG className="w-6 h-6" />
            ) : (
              <DownloadOffSVG className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>
      <BaseViewBody>
        <div className="space-x-2 pl-3 px-2 py-2 pb-3 w-full overflow-x-auto whitespace-nowrap">
          {tagsSelected.map((e, index) => (
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
          <CustomVirtualList
            itemCount={filteredLogs.length}
            itemData={filteredLogs}
          />
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
