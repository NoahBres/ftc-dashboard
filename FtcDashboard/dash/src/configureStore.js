import { applyMiddleware, createStore, compose } from 'redux';
import { createLogger } from 'redux-logger';
import thunk from 'redux-thunk';

import gamepadMiddleware from './store/middleware/gamepadMiddleware';
import socketMiddleware from './store/middleware/socketMiddleware';
import storageMiddleware from './store/middleware/storageMiddleware';
import reducer from './store/reducers/index';
import { RECEIVE_PING_TIME } from './store/actions/socket';
import { RECEIVE_TELEMETRY } from './store/actions/telemetry';
import { RECEIVE_ROBOT_STATUS, GET_ROBOT_STATUS } from './store/actions/status';

const HIDDEN_ACTIONS = [
  RECEIVE_PING_TIME,
  RECEIVE_TELEMETRY,
  RECEIVE_ROBOT_STATUS,
  GET_ROBOT_STATUS,
];

const configureStore = () => {
  const middlewares = [
    thunk,
    gamepadMiddleware,
    socketMiddleware,
    storageMiddleware,
  ];

  if (process.env.NODE_ENV === 'development') {
    const logger = createLogger({
      predicate: (getState, action) =>
        HIDDEN_ACTIONS.indexOf(action.type) === -1,
    });

    middlewares.push(logger);
  }

  return createStore(reducer, applyMiddleware.apply(null, middlewares));
};

export default configureStore;
