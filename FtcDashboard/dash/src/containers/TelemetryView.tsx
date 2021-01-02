import { FunctionComponent } from 'react';
import { useSelector } from 'react-redux';

import BaseView, {
  BaseViewProps,
  BaseViewHeading,
  BaseViewBody,
  BaseViewHeadingProps,
} from './BaseView';
import { RootState } from '../store/reducers';

type TelemetryViewProps = BaseViewProps & BaseViewHeadingProps;

const TelemetryView: FunctionComponent<TelemetryViewProps> = ({
  isDraggable = false,
  isUnlocked = false,
}) => {
  const telemetry = useSelector((state: RootState) => state.telemetry);

  const latestPacket = telemetry[telemetry.length - 1];
  const telemetryLines = Object.keys(latestPacket.data).map((key) => (
    <span key={key}>
      {key}: {latestPacket.data[key]}
      <br />
    </span>
  ));

  const telemetryLog = latestPacket.log.map((line, i) => (
    <span key={i}>
      {line}
      <br />
    </span>
  ));

  return (
    <BaseView isUnlocked={isUnlocked}>
      <BaseViewHeading isDraggable={isDraggable}>Telemetry</BaseViewHeading>
      <BaseViewBody>
        <p>{telemetryLines}</p>
        <p>{telemetryLog}</p>
      </BaseViewBody>
    </BaseView>
  );
};

export default TelemetryView;
