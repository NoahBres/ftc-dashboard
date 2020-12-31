import PropTypes from 'prop-types';

export const telemetryType = PropTypes.arrayOf(
  PropTypes.shape({
    log: PropTypes.arrayOf(PropTypes.string).isRequired,
    data: PropTypes.object.isRequired,
    timestamp: PropTypes.number.isRequired,
  }),
);

export const STOP_OP_MODE_TAG = '$Stop$Robot$';
