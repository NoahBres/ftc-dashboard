import { useState, useEffect, useRef, FunctionComponent } from 'react';
import { connect } from 'react-redux';

import { v4 as uuid4 } from 'uuid';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList as List } from 'react-window';

import BaseView, {
  BaseViewProps,
  BaseViewHeading,
  BaseViewBody,
  BaseViewHeadingProps,
} from './BaseView';
import { STOP_OP_MODE_TAG, Telemetry } from './types';
import OpModeStatus from '../enums/OpModeStatus';

type LoggingViewProps = {
  telemetry?: Telemetry;
  activeOpMode?: string;
  activeOpModeStatus?: OpModeStatus;
  opModeList?: string[];
} & BaseViewProps &
  BaseViewHeadingProps;

interface TelemetryStore {
  [key: string]: TelemetryField[];
}

interface TelemetryField {
  data: string;
  timestamp: number;
}

interface SelectedTag {
  tag: string;
  isChecked: boolean;
  id: string;
}

interface LogItem {
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

interface VirtualListItem {
  data: LogItem[];
  index: number;
  style: any;
}

const VirtualListItem: FunctionComponent<VirtualListItem> = ({
  data,
  index,
  style,
}: VirtualListItem) => {
  const time = new Date(data[index].timestamp);
  const tag = data[index].tag;
  const value = data[index].data;

  const hours = `0${time.getHours()}`;
  const minutes = `0${time.getMinutes()}`;
  const seconds = `0${time.getSeconds()}`;

  const formattedTime = `${hours.substr(-2)}:${minutes.substr(
    -2,
  )}:${seconds.substr(-2)}`;

  return (
    <div style={style}>
      {formattedTime} {tag} {value}
    </div>
  );
};

const LoggingView: FunctionComponent<LoggingViewProps> = ({
  telemetry,
  activeOpMode,
  activeOpModeStatus,
  opModeList,

  isDraggable = false,
  isUnlocked = false,
}: LoggingViewProps) => {
  const telemetryStore = useRef<TelemetryStore>({});
  const listRef = useRef<List>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [tagsSelected, setTagsSelected] = useState<SelectedTag[]>([]);

  const [filteredLogs, setFilteredLogs] = useState<LogItem[]>([]);

  const clearPastTelemetry = () => {
    telemetryStore.current = {};
    setTagsSelected([]);
    console.log('clear');
  };

  useEffect(() => {
    // console.log(telemetry);
    if (isRecording) {
      const newKeys: string[] = [];

      telemetry?.forEach((e) => {
        for (const [key, value] of Object.entries(e.data)) {
          // Ingest into telemetry store
          if (
            !Object.prototype.hasOwnProperty.call(telemetryStore.current, key)
          ) {
            telemetryStore.current[key] = [];

            newKeys.push(key);
          }

          telemetryStore.current[key].push({
            data: value,
            timestamp: e.timestamp,
          });

          // Ingest into filtered logs
          if (
            tagsSelected
              .filter((e) => e.isChecked)
              .map((e) => e.tag)
              .includes(key)
          ) {
            setFilteredLogs([
              ...filteredLogs,
              { timestamp: e.timestamp, data: value, tag: key },
            ]);
          }
        }
      });

      if (newKeys.length !== 0) {
        setTagsSelected([
          ...tagsSelected,
          ...newKeys.map((e) => ({ tag: e, isChecked: false, id: uuid4() })),
        ]);
      }
    } else {
      setIsRecording(true);
      clearPastTelemetry();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telemetry]);
  // }, [isRecording, tagsSelected, telemetry]);

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

  const tagPillOnChange = (id: string) => {
    const tagsSelectedCopy = [...tagsSelected];
    const targetIndex = tagsSelectedCopy.findIndex((e) => e.id === id);
    if (targetIndex !== -1) {
      tagsSelectedCopy[targetIndex].isChecked = !tagsSelectedCopy[targetIndex]
        .isChecked;
      setTagsSelected(tagsSelectedCopy);
    }
  };

  return (
    <BaseView
      className="flex flex-col"
      isUnlocked={isUnlocked}
      style={{ paddingLeft: '0' }}
    >
      <BaseViewHeading className="pl-4" isDraggable={isDraggable}>
        Logging View
      </BaseViewHeading>
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
          <AutoSizer>
            {({ height, width }) => (
              <List
                ref={listRef}
                className="List"
                height={height}
                itemCount={filteredLogs.length}
                itemData={filteredLogs}
                itemSize={35}
                width={width}
              >
                {VirtualListItem}
              </List>
            )}
          </AutoSizer>
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
