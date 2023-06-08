import { API_REQUEST } from "./actionTypes";

// API request action creator
export const apiRequest = (
  apiName: string,
  params?: Record<string, any>,
  body?: Record<string, any>
) => ({
  type: API_REQUEST,
  apiName,
  params,
  body,
});

// API success action creator
export const apiSuccess = (apiName: string, payload: any) => ({
  type: `${apiName}_SUCCESS`,
  apiName,
  payload,
});

// API failure action creator
export const apiFailure = (apiName: string, error: any) => ({
  type: `${apiName}_FAILURE`,
  apiName,
  error,
});
