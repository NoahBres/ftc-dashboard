import { Component, ChangeEvent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import styled from 'styled-components';

import { initOpMode, startOpMode, stopOpMode } from '../actions/opmode';
import OpModeStatus from '../enums/OpModeStatus';
import Icon from '../components/Icon';
import IconGroup from '../components/IconGroup';
import BaseView, { BaseViewHeading, BaseViewBody } from './BaseView';

interface OpModeViewState {
  selectedOpMode: string;
}

interface OpModeViewProps {
  available: boolean;
  activeOpMode: string;
  activeOpModeStatus: any;
  opModeList: any;
  warningMessage: string;
  errorMessage: string;
  dispatch: any;
  gamepad1Connected: boolean;
  gamepad2Connected: boolean;

  isDraggable: boolean;
  isUnlocked: boolean;
}

const STOP_OP_MODE = '$Stop$Robot$';

interface ActionButtonProps {
  customStyle: string;
}
const ActionButton = styled.button.attrs<ActionButtonProps>((props) => {
  // eslint-disable-next-line no-unused-labels
  className: `ml-3 py-1 px-4 border rounded-md shadow-md ${props.customStyle}`;
})<ActionButtonProps>``;

class OpModeView extends Component<OpModeViewProps, OpModeViewState> {
  constructor(props: OpModeViewProps) {
    super(props);

    this.state = {
      selectedOpMode: '',
    };

    this.onChange = this.onChange.bind(this);
  }

  static propTypes = {
    available: PropTypes.bool.isRequired,
    activeOpMode: PropTypes.string.isRequired,
    activeOpModeStatus: PropTypes.oneOf(Object.keys(OpModeStatus)),
    opModeList: PropTypes.arrayOf(PropTypes.string).isRequired,
    warningMessage: PropTypes.string.isRequired,
    errorMessage: PropTypes.string.isRequired,
    dispatch: PropTypes.func.isRequired,
    gamepad1Connected: PropTypes.bool.isRequired,
    gamepad2Connected: PropTypes.bool.isRequired,

    isDraggable: PropTypes.bool,
    isUnlocked: PropTypes.bool,
  };

  static getDerivedStateFromProps(
    props: OpModeViewProps,
    state: OpModeViewState,
  ) {
    if (props.activeOpMode !== STOP_OP_MODE) {
      return {
        selectedOpMode: props.activeOpMode,
      };
    } else if (
      state.selectedOpMode === '' ||
      props.opModeList.indexOf(state.selectedOpMode) === -1
    ) {
      return {
        selectedOpMode: props.opModeList[0] || '',
      };
    } else {
      return {};
    }
  }

  onChange(evt: ChangeEvent<HTMLSelectElement>) {
    this.setState({
      selectedOpMode: evt.target.value,
    });
  }

  renderInitButton() {
    return (
      <ActionButton
        customStyle="bg-blue-200 border-blue-300"
        onClick={() =>
          this.props.dispatch(initOpMode(this.state.selectedOpMode))
        }
      >
        Init
      </ActionButton>
    );
  }

  renderStartButton() {
    return (
      <ActionButton
        customStyle="bg-green-200 border-green-300"
        onClick={() => this.props.dispatch(startOpMode())}
      >
        Start
      </ActionButton>
    );
  }

  renderStopButton() {
    return (
      <ActionButton
        customStyle="bg-red-200 border-red-300"
        onClick={() => this.props.dispatch(stopOpMode())}
      >
        Stop
      </ActionButton>
    );
  }

  renderButtons() {
    const { activeOpMode, activeOpModeStatus, opModeList } = this.props;

    if (opModeList.length === 0) {
      return null;
    } else if (activeOpMode === STOP_OP_MODE) {
      return this.renderInitButton();
    } else if (activeOpModeStatus === OpModeStatus.INIT) {
      return (
        <span>
          {this.renderStartButton()}
          {this.renderStopButton()}
        </span>
      );
    } else if (activeOpModeStatus === OpModeStatus.RUNNING) {
      return this.renderStopButton();
    } else if (activeOpModeStatus === OpModeStatus.STOPPED) {
      return null;
    } else {
      return <p>Unknown op mode status: {activeOpModeStatus}</p>;
    }
  }

  render() {
    const {
      available,
      activeOpMode,
      opModeList,
      warningMessage,
      errorMessage,
    } = this.props;

    const { gamepad1Connected, gamepad2Connected } = this.props;

    if (!available) {
      return (
        <BaseView isUnlocked={this.props.isUnlocked}>
          <BaseViewHeading isDraggable={this.props.isDraggable}>
            Op Mode
          </BaseViewHeading>
          <BaseViewBody>
            <h3 className="text-lg text-center">
              Op mode controls have not initialized
            </h3>
          </BaseViewBody>
        </BaseView>
      );
    }

    return (
      <BaseView isUnlocked={this.props.isUnlocked}>
        <div className="flex-center">
          <BaseViewHeading isDraggable={this.props.isDraggable}>
            Op Mode
          </BaseViewHeading>
          <IconGroup>
            <Icon
              opacity={gamepad1Connected ? 1.0 : 0.3}
              icon="gamepad"
              size="small"
            />
            <Icon
              opacity={gamepad2Connected ? 1.0 : 0.3}
              icon="gamepad"
              size="small"
            />
          </IconGroup>
        </div>
        <BaseViewBody>
          <select
            className="bg-gray-200 rounded py-2 pr-7 px-2 border border-gray-300 shadow-md disabled:shadow-none disabled:text-gray-600 transition"
            value={this.state.selectedOpMode}
            disabled={activeOpMode !== STOP_OP_MODE || opModeList.length === 0}
            onChange={this.onChange}
          >
            {opModeList.length === 0 ? (
              <option>Loading...</option>
            ) : (
              opModeList
                .sort()
                .map((opMode: any) => <option key={opMode}>{opMode}</option>)
            )}
          </select>
          {this.renderButtons()}
          {errorMessage !== '' ? (
            <p className="error mt-5">Error: {errorMessage}</p>
          ) : null}
          {warningMessage !== '' ? (
            <p className="warning mt-5">Warning: {warningMessage}</p>
          ) : null}
        </BaseViewBody>
      </BaseView>
    );
  }
}

const mapStateToProps = ({
  status,
  gamepad,
}: {
  status: any;
  gamepad: any;
}) => ({
  ...status,
  ...gamepad,
});

export default connect(mapStateToProps)(OpModeView as any);
