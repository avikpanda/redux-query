// store.js
import { createStore, combineReducers, applyMiddleware } from "redux";
import createSagaMiddleware from "redux-saga";
import { all } from "redux-saga/effects";
import { watchApiRequests } from "./sagas";

const createApiReducer =
  (apiName: string) =>
  (state = null, action: any) => {
    switch (action.type) {
      case `${apiName}_SUCCESS`:
        return action.payload;
      case `${apiName}_FAILURE`:
        return null;
      default:
        return state;
    }
  };

// Root reducer
const rootReducer = combineReducers({
  getUsers: createApiReducer("getUsers"), // Example API reducer
});

// Root saga
function* rootSaga() {
  yield all([watchApiRequests()]);
}

const sagaMiddleware = createSagaMiddleware();
const store = createStore(rootReducer, applyMiddleware(sagaMiddleware));

sagaMiddleware.run(rootSaga);

export default store;
