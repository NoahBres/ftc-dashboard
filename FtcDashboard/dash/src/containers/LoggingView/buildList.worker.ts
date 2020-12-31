import { TelemetryStoreItem, LogItem } from './LoggingView';

export function buildList(
  telemetryStore: TelemetryStoreItem[],
  selectedTags: string[],
): LogItem[] {
  return telemetryStore.reduce((acc, curr) => {
    const newLogs = curr.data
      .filter((e) => selectedTags.includes(e.tag))
      .map((e) => ({
        timestamp: curr.timestamp,
        tag: e.tag,
        data: e.data,
      }));

    return [...acc, ...newLogs];
  }, [] as LogItem[]);
}
