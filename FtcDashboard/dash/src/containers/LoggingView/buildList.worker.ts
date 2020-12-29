// Explanation on why workers have a very weird shim going on
// requiring a hook middle man
// https://github.com/developit/workerize-loader/issues/5#issuecomment-570663710

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
