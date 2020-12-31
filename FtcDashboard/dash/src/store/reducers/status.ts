import OpModeStatus from '../../enums/OpModeStatus';
import {
  ReceiveOpModeListAction,
  ReceiveRobotStatusAction,
  RECEIVE_OP_MODE_LIST,
  RECEIVE_ROBOT_STATUS,
} from '../types';

const initialState = {
  available: false,
  activeOpMode: '',
  activeOpModeStatus: OpModeStatus.STOPPED,
  opModeList: [],
  warningMessage: '',
  errorMessage: '',
};

const telemetry = (
  state = initialState,
  action: ReceiveRobotStatusAction | ReceiveOpModeListAction,
) => {
  switch (action.type) {
    case RECEIVE_ROBOT_STATUS:
      return {
        ...state,
        ...action.status,
      };
    case RECEIVE_OP_MODE_LIST:
      return {
        ...state,
        opModeList: action.opModeList,
      };
    default:
      return state;
  }
};

export default telemetry;
