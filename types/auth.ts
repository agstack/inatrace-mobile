export interface LogInResponse {
  success: boolean;
  errorStatus: string;
}

export interface RequestParams {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: any;
  /** Milliseconds before the request is aborted. Defaults to no timeout. */
  timeout?: number;
}
