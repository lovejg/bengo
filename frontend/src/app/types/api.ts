export interface ApiErrorBody {
  code?: string;
  message?: string;
  requestId?: string;
}

export interface ApiErrorResponse {
  error?: ApiErrorBody | string;
  message?: string | string[];
  statusCode?: number;
}

export interface ListResponse<T> {
  total: number;
  items: T[];
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: HeadersInit;
  query?: Record<
    string,
    | string
    | number
    | boolean
    | Array<string | number | boolean>
    | undefined
    | null
  >;
  auth?: boolean;
  signal?: AbortSignal;
}
