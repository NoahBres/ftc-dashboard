import { FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { telemetryType } from './types';

import BaseView, {
  BaseViewProps,
  BaseViewHeading,
  BaseViewBody,
  BaseViewHeadingProps,
} from './BaseView';

type TelemetryViewProps = {
  telemetry?: any;
} & BaseViewProps &
  BaseViewHeadingProps;

const TelemetryView: FunctionComponent<TelemetryViewProps> = ({
  telemetry,
  isDraggable = false,
  isUnlocked = false,
}) => {
  const latestPacket = telemetry[telemetry.length - 1];
  const telemetryLines = Object.keys(latestPacket.data).map((key) => (
    <span key={key}>
      {key}: {latestPacket.data[key]}
      <br />
    </span>
  ));

  const telemetryLog = latestPacket.log.map((line: any, i: number) => (
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

TelemetryView.propTypes = {
  telemetry: telemetryType.isRequired,

  isDraggable: PropTypes.bool,
  isUnlocked: PropTypes.bool,
};

const mapStateToProps = ({ telemetry }: { telemetry: any }) => ({ telemetry });

export default connect(mapStateToProps)(TelemetryView);
