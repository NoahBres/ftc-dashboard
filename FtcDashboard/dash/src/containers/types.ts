import PropTypes from 'prop-types';

export type Telemetry = TelemetryItem[];

export interface TelemetryItem {
  data: {
    [key: string]: string;
  };
  fieldOverlay: {
    ops: any[];
  };
  log: string[];
  timestamp: number;
}

export const telemetryType = PropTypes.arrayOf(
  PropTypes.shape({
    log: PropTypes.arrayOf(PropTypes.string).isRequired,
    data: PropTypes.object.isRequired,
    timestamp: PropTypes.number.isRequired,
  }),
);

export const STOP_OP_MODE_TAG = '$Stop$Robot$';
