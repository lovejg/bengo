interface EnvShape {
  NODE_ENV: string;
  PORT: number;
  POSTGRES_HOST: string;
  POSTGRES_PORT: number;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_DB: string;
  POSTGRES_SYNC: boolean;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  DATA_GO_KR_API_KEY?: string;
  DATA_GO_KR_API_URL?: string;
  DATA_GO_KR_API_KEY_PARAM?: string;
  DATA_GO_KR_PAGE_PARAM?: string;
  DATA_GO_KR_PAGE_SIZE_PARAM?: string;
  DATA_GO_KR_PAGE_SIZE?: number;
  DATA_GO_KR_MAX_PAGES?: number;
  YOUTHCENTER_POLICY_API_KEY?: string;
  YOUTHCENTER_POLICY_API_URL?: string;
  YOUTHCENTER_POLICY_API_KEY_PARAM?: string;
  YOUTHCENTER_POLICY_PAGE_PARAM?: string;
  YOUTHCENTER_POLICY_PAGE_SIZE_PARAM?: string;
  YOUTHCENTER_POLICY_PAGE_TYPE_PARAM?: string;
  YOUTHCENTER_POLICY_PAGE_TYPE?: string;
  YOUTHCENTER_POLICY_RETURN_TYPE_PARAM?: string;
  YOUTHCENTER_POLICY_RETURN_TYPE?: string;
  YOUTHCENTER_POLICY_PAGE_SIZE?: number;
  YOUTHCENTER_POLICY_MAX_PAGES?: number;
  YOUTHCENTER_POLICY_REGION_PARAM?: string;
  YOUTHCENTER_POLICY_REGION_VALUE?: string;
  YOUTHCENTER_CENTER_API_KEY?: string;
  YOUTHCENTER_CENTER_API_URL?: string;
  YOUTHCENTER_CENTER_API_KEY_PARAM?: string;
  YOUTHCENTER_CENTER_PAGE_PARAM?: string;
  YOUTHCENTER_CENTER_PAGE_SIZE_PARAM?: string;
  YOUTHCENTER_CENTER_PAGE_TYPE_PARAM?: string;
  YOUTHCENTER_CENTER_PAGE_TYPE?: string;
  YOUTHCENTER_CENTER_RETURN_TYPE_PARAM?: string;
  YOUTHCENTER_CENTER_RETURN_TYPE?: string;
  YOUTHCENTER_CENTER_PAGE_SIZE?: number;
  SEOUL_OPEN_API_KEY?: string;
  SEOUL_OPEN_API_URL?: string;
  SEOUL_OPEN_API_KEY_PARAM?: string;
  SEOUL_OPEN_API_HOST?: string;
  SEOUL_OPEN_API_FORMAT?: string;
  SEOUL_OPEN_API_SERVICE_NAME?: string;
  SEOUL_OPEN_API_SERVICE_NAMES?: string;
  SEOUL_OPEN_API_START_INDEX?: number;
  SEOUL_OPEN_API_END_INDEX?: number;
  SEOUL_OPEN_API_PAGE_SIZE?: number;
  SEOUL_OPEN_API_MAX_PAGES?: number;
  ANTHROPIC_API_KEY?: string;
  LLM_MODEL?: string;
  LLM_ENABLED?: string;
}

function toNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  return ['true', '1', 'yes'].includes(value.toLowerCase());
}

export function validateEnv(config: Record<string, unknown>): EnvShape {
  const env = {
    NODE_ENV: String(config.NODE_ENV ?? 'development'),
    PORT: toNumber(config.PORT as string | undefined, 4000),
    POSTGRES_HOST: String(config.POSTGRES_HOST ?? 'localhost'),
    POSTGRES_PORT: toNumber(config.POSTGRES_PORT as string | undefined, 5432),
    POSTGRES_USER: String(config.POSTGRES_USER ?? 'postgres'),
    POSTGRES_PASSWORD: String(config.POSTGRES_PASSWORD ?? 'postgres'),
    POSTGRES_DB: String(config.POSTGRES_DB ?? 'bengo'),
    POSTGRES_SYNC: toBoolean(config.POSTGRES_SYNC as string | undefined, false),
    REDIS_HOST: String(config.REDIS_HOST ?? 'localhost'),
    REDIS_PORT: toNumber(config.REDIS_PORT as string | undefined, 6379),
    REDIS_PASSWORD: config.REDIS_PASSWORD
      ? String(config.REDIS_PASSWORD)
      : undefined,
    JWT_SECRET: String(config.JWT_SECRET ?? ''),
    JWT_EXPIRES_IN: String(config.JWT_EXPIRES_IN ?? '7d'),
    DATA_GO_KR_API_KEY: config.DATA_GO_KR_API_KEY
      ? String(config.DATA_GO_KR_API_KEY)
      : undefined,
    DATA_GO_KR_API_URL: config.DATA_GO_KR_API_URL
      ? String(config.DATA_GO_KR_API_URL)
      : undefined,
    DATA_GO_KR_API_KEY_PARAM: config.DATA_GO_KR_API_KEY_PARAM
      ? String(config.DATA_GO_KR_API_KEY_PARAM)
      : undefined,
    DATA_GO_KR_PAGE_PARAM: config.DATA_GO_KR_PAGE_PARAM
      ? String(config.DATA_GO_KR_PAGE_PARAM)
      : undefined,
    DATA_GO_KR_PAGE_SIZE_PARAM: config.DATA_GO_KR_PAGE_SIZE_PARAM
      ? String(config.DATA_GO_KR_PAGE_SIZE_PARAM)
      : undefined,
    DATA_GO_KR_PAGE_SIZE: toNumber(
      config.DATA_GO_KR_PAGE_SIZE as string | undefined,
      100,
    ),
    DATA_GO_KR_MAX_PAGES: toNumber(
      config.DATA_GO_KR_MAX_PAGES as string | undefined,
      20,
    ),
    YOUTHCENTER_POLICY_API_KEY: config.YOUTHCENTER_POLICY_API_KEY
      ? String(config.YOUTHCENTER_POLICY_API_KEY)
      : undefined,
    YOUTHCENTER_POLICY_API_URL: config.YOUTHCENTER_POLICY_API_URL
      ? String(config.YOUTHCENTER_POLICY_API_URL)
      : undefined,
    YOUTHCENTER_POLICY_API_KEY_PARAM: config.YOUTHCENTER_POLICY_API_KEY_PARAM
      ? String(config.YOUTHCENTER_POLICY_API_KEY_PARAM)
      : undefined,
    YOUTHCENTER_POLICY_PAGE_PARAM: config.YOUTHCENTER_POLICY_PAGE_PARAM
      ? String(config.YOUTHCENTER_POLICY_PAGE_PARAM)
      : undefined,
    YOUTHCENTER_POLICY_PAGE_SIZE_PARAM: config.YOUTHCENTER_POLICY_PAGE_SIZE_PARAM
      ? String(config.YOUTHCENTER_POLICY_PAGE_SIZE_PARAM)
      : undefined,
    YOUTHCENTER_POLICY_PAGE_TYPE_PARAM: config.YOUTHCENTER_POLICY_PAGE_TYPE_PARAM
      ? String(config.YOUTHCENTER_POLICY_PAGE_TYPE_PARAM)
      : undefined,
    YOUTHCENTER_POLICY_PAGE_TYPE: config.YOUTHCENTER_POLICY_PAGE_TYPE
      ? String(config.YOUTHCENTER_POLICY_PAGE_TYPE)
      : undefined,
    YOUTHCENTER_POLICY_RETURN_TYPE_PARAM: config.YOUTHCENTER_POLICY_RETURN_TYPE_PARAM
      ? String(config.YOUTHCENTER_POLICY_RETURN_TYPE_PARAM)
      : undefined,
    YOUTHCENTER_POLICY_RETURN_TYPE: config.YOUTHCENTER_POLICY_RETURN_TYPE
      ? String(config.YOUTHCENTER_POLICY_RETURN_TYPE)
      : undefined,
    YOUTHCENTER_POLICY_PAGE_SIZE: toNumber(
      config.YOUTHCENTER_POLICY_PAGE_SIZE as string | undefined,
      100,
    ),
    YOUTHCENTER_POLICY_MAX_PAGES: toNumber(
      config.YOUTHCENTER_POLICY_MAX_PAGES as string | undefined,
      30,
    ),
    YOUTHCENTER_POLICY_REGION_PARAM: config.YOUTHCENTER_POLICY_REGION_PARAM
      ? String(config.YOUTHCENTER_POLICY_REGION_PARAM)
      : undefined,
    YOUTHCENTER_POLICY_REGION_VALUE: config.YOUTHCENTER_POLICY_REGION_VALUE
      ? String(config.YOUTHCENTER_POLICY_REGION_VALUE)
      : undefined,
    YOUTHCENTER_CENTER_API_KEY: config.YOUTHCENTER_CENTER_API_KEY
      ? String(config.YOUTHCENTER_CENTER_API_KEY)
      : undefined,
    YOUTHCENTER_CENTER_API_URL: config.YOUTHCENTER_CENTER_API_URL
      ? String(config.YOUTHCENTER_CENTER_API_URL)
      : undefined,
    YOUTHCENTER_CENTER_API_KEY_PARAM: config.YOUTHCENTER_CENTER_API_KEY_PARAM
      ? String(config.YOUTHCENTER_CENTER_API_KEY_PARAM)
      : undefined,
    YOUTHCENTER_CENTER_PAGE_PARAM: config.YOUTHCENTER_CENTER_PAGE_PARAM
      ? String(config.YOUTHCENTER_CENTER_PAGE_PARAM)
      : undefined,
    YOUTHCENTER_CENTER_PAGE_SIZE_PARAM: config.YOUTHCENTER_CENTER_PAGE_SIZE_PARAM
      ? String(config.YOUTHCENTER_CENTER_PAGE_SIZE_PARAM)
      : undefined,
    YOUTHCENTER_CENTER_PAGE_TYPE_PARAM: config.YOUTHCENTER_CENTER_PAGE_TYPE_PARAM
      ? String(config.YOUTHCENTER_CENTER_PAGE_TYPE_PARAM)
      : undefined,
    YOUTHCENTER_CENTER_PAGE_TYPE: config.YOUTHCENTER_CENTER_PAGE_TYPE
      ? String(config.YOUTHCENTER_CENTER_PAGE_TYPE)
      : undefined,
    YOUTHCENTER_CENTER_RETURN_TYPE_PARAM: config.YOUTHCENTER_CENTER_RETURN_TYPE_PARAM
      ? String(config.YOUTHCENTER_CENTER_RETURN_TYPE_PARAM)
      : undefined,
    YOUTHCENTER_CENTER_RETURN_TYPE: config.YOUTHCENTER_CENTER_RETURN_TYPE
      ? String(config.YOUTHCENTER_CENTER_RETURN_TYPE)
      : undefined,
    YOUTHCENTER_CENTER_PAGE_SIZE: toNumber(
      config.YOUTHCENTER_CENTER_PAGE_SIZE as string | undefined,
      100,
    ),
    SEOUL_OPEN_API_KEY: config.SEOUL_OPEN_API_KEY
      ? String(config.SEOUL_OPEN_API_KEY)
      : undefined,
    SEOUL_OPEN_API_URL: config.SEOUL_OPEN_API_URL
      ? String(config.SEOUL_OPEN_API_URL)
      : undefined,
    SEOUL_OPEN_API_KEY_PARAM: config.SEOUL_OPEN_API_KEY_PARAM
      ? String(config.SEOUL_OPEN_API_KEY_PARAM)
      : undefined,
    SEOUL_OPEN_API_HOST: config.SEOUL_OPEN_API_HOST
      ? String(config.SEOUL_OPEN_API_HOST)
      : undefined,
    SEOUL_OPEN_API_FORMAT: config.SEOUL_OPEN_API_FORMAT
      ? String(config.SEOUL_OPEN_API_FORMAT)
      : undefined,
    SEOUL_OPEN_API_SERVICE_NAME: config.SEOUL_OPEN_API_SERVICE_NAME
      ? String(config.SEOUL_OPEN_API_SERVICE_NAME)
      : undefined,
    SEOUL_OPEN_API_SERVICE_NAMES: config.SEOUL_OPEN_API_SERVICE_NAMES
      ? String(config.SEOUL_OPEN_API_SERVICE_NAMES)
      : undefined,
    SEOUL_OPEN_API_START_INDEX: toNumber(
      config.SEOUL_OPEN_API_START_INDEX as string | undefined,
      1,
    ),
    SEOUL_OPEN_API_END_INDEX: toNumber(
      config.SEOUL_OPEN_API_END_INDEX as string | undefined,
      100,
    ),
    SEOUL_OPEN_API_PAGE_SIZE: toNumber(
      config.SEOUL_OPEN_API_PAGE_SIZE as string | undefined,
      100,
    ),
    SEOUL_OPEN_API_MAX_PAGES: toNumber(
      config.SEOUL_OPEN_API_MAX_PAGES as string | undefined,
      30,
    ),
    ANTHROPIC_API_KEY: config.ANTHROPIC_API_KEY
      ? String(config.ANTHROPIC_API_KEY)
      : undefined,
    LLM_MODEL: config.LLM_MODEL
      ? String(config.LLM_MODEL)
      : undefined,
    LLM_ENABLED: config.LLM_ENABLED
      ? String(config.LLM_ENABLED)
      : undefined,
  };

  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }

  return env;
}
