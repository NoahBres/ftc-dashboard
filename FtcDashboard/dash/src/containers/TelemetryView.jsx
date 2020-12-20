import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { telemetryType } from './types';

import BaseView from './BaseView';

const TelemetryView = ({ telemetry, isDraggable, showShadow }) => {
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
    <BaseView showShadow={showShadow}>
      <h2
        className={`${
          isDraggable ? 'grab-handle' : ''
        } text-xl w-full py-2 font-bold`}
      >
        Telemetry
      </h2>
      <p>{telemetryLines}</p>
      <p>{telemetryLog}</p>
    </BaseView>
  );
};

TelemetryView.propTypes = {
  telemetry: telemetryType.isRequired,

  isDraggable: PropTypes.bool,
  showShadow: PropTypes.bool,
};

const mapStateToProps = ({ telemetry }) => ({ telemetry });

export default connect(mapStateToProps)(TelemetryView);
