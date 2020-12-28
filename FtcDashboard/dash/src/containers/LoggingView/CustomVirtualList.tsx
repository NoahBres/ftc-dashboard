import { useState, useEffect, useRef, FunctionComponent } from 'react';

import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList as List } from 'react-window';

import { LogItem } from './LoggingView';

interface CustomVirtualListProps {
  itemCount: number;
  itemData: LogItem[];
}

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

const CustomVirtualList: FunctionComponent<CustomVirtualListProps> = ({
  itemCount,
  itemData,
}: CustomVirtualListProps) => {
  const listRef = useRef<List>(null);

  const [isScrollAtBottom, setIsScrollAtBottom] = useState(true);

  useEffect(() => {
    if (listRef.current) {
      if (isScrollAtBottom) {
        listRef.current.scrollTo(
          listRef.current.props.itemCount * LIST_ITEM_HEIGHT -
            (listRef.current.props.height as number),
        );
      }
    }
  }, [itemData, isScrollAtBottom]);

  const onListScroll = ({
    scrollOffset,
    scrollUpdateWasRequested,
  }: {
    scrollOffset: number;
    scrollUpdateWasRequested: boolean;
  }) => {
    const BOTTOM_THRESHOLD = 5;

    if (listRef.current) {
      const bottom =
        listRef.current.props.itemCount * listRef.current.props.itemSize -
        (listRef.current.props.height as number) -
        scrollOffset;

      if (!scrollUpdateWasRequested) {
        if (bottom <= BOTTOM_THRESHOLD) setIsScrollAtBottom(true);
        else setIsScrollAtBottom(false);
      }
    }
  };

  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          ref={listRef}
          className="List"
          height={height}
          itemCount={itemCount}
          itemData={itemData}
          itemSize={LIST_ITEM_HEIGHT}
          width={width}
          onScroll={onListScroll}
        >
          {VirtualListItem}
        </List>
      )}
    </AutoSizer>
  );
};

export default CustomVirtualList;
