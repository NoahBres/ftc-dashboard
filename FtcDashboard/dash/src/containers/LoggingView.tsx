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

const LIST_ITEM_HEIGHT = 35;

const VirtualListItem: FunctionComponent<VirtualListItem> = ({
  data,
  index,
  style,
}: VirtualListItem) => {
  const time = new Date(data[index].timestamp);
  const tag = data[index].tag;
  const value = data[index].data;

  return (
    <div style={style} className="flex items-center">
      <span className="text-neutral-gray-300 mr-2">
        {time.toISOString().slice(11, -1)}
      </span>{' '}
      <span className="w-32 inline-block truncate mr-2 font-semibold">
        {tag}:
      </span>{' '}
      <span>{value}</span>
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
  const telemetryStore = useRef<TelemetryStoreItem[]>([]);
  const listRef = useRef<List>(null);
  const storedTags = useRef<string[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [tagsSelected, setTagsSelected] = useState<SelectedTag[]>([]);

  const [filteredLogs, setFilteredLogs] = useState<LogItem[]>([]);
  const [isScrollAtBottom, setIsScrollAtBottom] = useState(true);

  const clearPastTelemetry = () => {
    telemetryStore.current = [];
    storedTags.current = [];

    setTagsSelected([]);
    setFilteredLogs([]);
  };

  useEffect(() => {
    if (isRecording) {
      const newKeys: string[] = [];
      const newLog: LogItem[] = [];

      telemetry?.forEach((e) => {
        const newTelemetryStoreItem: TelemetryField[] = [];

        for (const [key, value] of Object.entries(e.data)) {
          if (!storedTags.current.includes(key)) {
            newKeys.push(key);
            storedTags.current.push(key);
          }

          newTelemetryStoreItem.push({ tag: key, data: value });

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

        if (newTelemetryStoreItem.length !== 0) {
          telemetryStore.current.push({
            timestamp: e.timestamp,
            data: newTelemetryStoreItem,
          });
        }
      });

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
    if (listRef.current) {
      if (isScrollAtBottom) {
        const props = listRef.current.props;
        listRef.current.scrollTo(
          props.itemCount * props.itemSize - (props.height as number),
        );
      }
    }
  }, [filteredLogs, isScrollAtBottom]);

  const tagPillOnChange = (id: string) => {
    const tagsSelectedCopy = [...tagsSelected];
    const targetIndex = tagsSelectedCopy.findIndex((e) => e.id === id);
    if (targetIndex !== -1) {
      tagsSelectedCopy[targetIndex].isChecked = !tagsSelectedCopy[targetIndex]
        .isChecked;

      setTagsSelected(tagsSelectedCopy);
      updateFilteredLogs(tagsSelectedCopy);
    }
  };

  const updateFilteredLogs = (tags: SelectedTag[]) => {
    const newFilteredLogs = telemetryStore.current.reduce((acc, curr) => {
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

  const onListScroll = ({
    scrollOffset,
    scrollUpdateWasRequested,
  }: {
    scrollOffset: number;
    scrollUpdateWasRequested: boolean;
  }) => {
    const BOTTOM_THRESHOLD = 5;

    if (listRef.current) {
      const props = listRef.current.props;
      const bottom =
        props.itemCount * props.itemSize -
        (props.height as number) -
        scrollOffset;

      if (!scrollUpdateWasRequested) {
        if (bottom <= BOTTOM_THRESHOLD) setIsScrollAtBottom(true);
        else setIsScrollAtBottom(false);
      }
    }
  };

  return (
    <BaseView
      className="flex flex-col"
      isUnlocked={isUnlocked}
      style={{ paddingLeft: '0' }}
    >
      <BaseViewHeading className="pl-4" isDraggable={isDraggable}>
        Logging View | {filteredLogs.length}
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
                itemSize={LIST_ITEM_HEIGHT}
                width={width}
                onScroll={onListScroll}
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
