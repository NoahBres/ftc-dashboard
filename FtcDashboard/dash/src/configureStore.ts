import { applyMiddleware, createStore } from 'redux';
import { createLogger } from 'redux-logger';
import thunk from 'redux-thunk';

import gamepadMiddleware from './store/middleware/gamepadMiddleware';
import socketMiddleware from './store/middleware/socketMiddleware';
import storageMiddleware from './store/middleware/storageMiddleware';
import rootReducer from './store/reducers';
import {
  GET_ROBOT_STATUS,
  RECEIVE_PING_TIME,
  RECEIVE_ROBOT_STATUS,
  RECEIVE_TELEMETRY,
} from './store/types';

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

  return createStore(rootReducer, applyMiddleware(...middlewares));
};

export default configureStore;
