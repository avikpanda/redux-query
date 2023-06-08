import { call, put, takeEvery } from "redux-saga/effects";
import { apiFailure, apiSuccess } from "./actionCreators";
import { CacheEvictionStrategy, CacheHandler } from "../cache/CacheHandler";
import { API_REQUEST } from "./actionTypes";
import { apiRequestFunction, generateHash } from "../utils";

export function* apiSaga(action: any) {
  const { apiName, params, body } = action;

  try {
    const cacheHandler: CacheHandler = yield CacheHandler.getInstance();
    // const cacheHandler: CacheHandler = yield new CacheHandler({
    //   evictionStrategy: CacheEvictionStrategy.LRU,
    //   useServiceWorker: false,
    // });

    yield cacheHandler.init();
    // yield cacheHandler.add("key1", "avik");
    // yield cacheHandler.remove("key1");

    //   call(cacheHandler.addBatch, [
    //       { key: "key2", value: "value2" },
    //       { key: "key3", value: "value3" },
    //       { key: "key4", value: "value4" },
    //       { key: "key5", value: "value5" },
    //     ]);

    // Generate a unique hash based on the API params and request body
    const hash: string = yield generateHash(apiName, params, body);

    // Check if data is already cached
    const cachedData: string | null = yield cacheHandler.search(
      `${apiName}${hash}`
    );

    if (cachedData) {
      yield put(apiSuccess(apiName, cachedData));
    } else {
      // Perform API request
      const response: string = yield call(
        apiRequestFunction,
        apiName,
        params,
        body
      );
      console.log(response);

      yield put(apiSuccess(apiName, response));
      yield cacheHandler.add(`${apiName}${hash}`, response);
    }
  } catch (error) {
    console.error(error);
    yield put(apiFailure(apiName, error));
  }
}

// Watcher saga to handle API_REQUEST actions
export function* watchApiRequests() {
  yield takeEvery(API_REQUEST, apiSaga);
}
