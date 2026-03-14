export const PLAN_LIMITS = {
  starter: { max_seats: 3, max_experiments: 500 },
  growth: { max_seats: 15, max_experiments: 5000 },
  enterprise: { max_seats: 999999, max_experiments: 100000 },
} as const

export const DUPLICATE_THRESHOLD_DEFAULT = 0.85
export const DUPLICATE_THRESHOLD_MIN = 0.7
export const DUPLICATE_THRESHOLD_MAX = 1.0

export const EMBEDDING_DIMENSIONS = 1536
export const EMBEDDING_MODEL = 'text-embedding-3-small'

export const API_KEY_PREFIX = 'ev_'
export const INVITE_TOKEN_EXPIRY_DAYS = 7

export const PAGINATION_DEFAULT_LIMIT = 20
export const PAGINATION_MAX_LIMIT = 100
