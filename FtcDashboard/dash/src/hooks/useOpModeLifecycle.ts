import { useEffect, useReducer } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/reducers';

type OpModeState = 'STOPPED' | 'INIT' | 'RUNNING';

type Listeners = {
  [K in OpModeState]?: {
    onEnter?: ({
      lastState,
      lastOpModeName,
      newOpModeName,
    }: {
      lastState: OpModeState;
      lastOpModeName: string;
      newOpModeName: string;
    }) => void;
    onExit?: ({
      newState,
      lastOpModeName,
      newOpModeName,
    }: {
      newState: OpModeState;
      lastOpModeName: string;
      newOpModeName: string;
    }) => void;
  };
};

type LifeCycleState = {
  currentState: OpModeState;
  opModeName: string;
  listeners: Listeners;
};

const STOP_TAG = '$Stop$Robot$';

const lifeCycleReducer = (
  state: LifeCycleState,
  action: { activeOpMode: string; status: string },
): LifeCycleState => {
  const { activeOpMode, status } = action;

  const transition = (
    newState: OpModeState,
    newOpModeName: string,
    listeners: Listeners,
  ): LifeCycleState => {
    listeners[state.currentState]?.onExit?.({
      newState,
      newOpModeName,
      lastOpModeName: state.opModeName,
    });

    listeners[newState]?.onEnter?.({
      lastState: state.currentState,
      lastOpModeName: state.opModeName,
      newOpModeName,
    });

    return {
      ...state,
      currentState: newState,
      opModeName: newOpModeName,
    };
  };

  switch (state.currentState) {
    case 'STOPPED': {
      if (
        activeOpMode === '' ||
        activeOpMode === STOP_TAG ||
        status === 'STOPPED'
      )
        return state;
      else if (status === 'INIT')
        return transition('INIT', activeOpMode, state.listeners);
      else if (status === 'RUNNING')
        return transition('RUNNING', activeOpMode, state.listeners);

      return state;
    }
    case 'INIT': {
      if (
        activeOpMode === '' ||
        activeOpMode === STOP_TAG ||
        status === 'STOPPED'
      )
        return transition('STOPPED', '', state.listeners);
      else if (status === 'RUNNING')
        return transition('RUNNING', activeOpMode, state.listeners);
      else if (status === 'INIT')
        return transition('INIT', activeOpMode, state.listeners);

      return state;
    }

    case 'RUNNING': {
      if (
        activeOpMode === '' ||
        activeOpMode === STOP_TAG ||
        status === 'STOPPED'
      )
        return transition('STOPPED', '', state.listeners);
      else if (status === 'INIT')
        return transition('INIT', activeOpMode, state.listeners);
      else if (status === 'RUNNING')
        return transition('RUNNING', activeOpMode, state.listeners);

      return state;
    }
  }
};

export default function useOpModeLifecycle(listeners: Listeners = {}) {
  const { activeOpMode, activeOpModeStatus } = useSelector(
    (state: RootState) => state.status,
  );

  const [lifeCycleState, dispatch] = useReducer(lifeCycleReducer, {
    currentState: 'STOPPED',
    opModeName: '',
    listeners,
  });

  useEffect(() => {
    dispatch({
      activeOpMode,
      status: activeOpModeStatus,
    });
  }, [activeOpMode, activeOpModeStatus]);

  return lifeCycleState;
}
