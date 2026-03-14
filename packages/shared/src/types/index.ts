export type ExperimentResult = 'WON' | 'LOST' | 'INCONCLUSIVE' | 'STOPPED'
export type ExperimentStatus = 'draft' | 'active' | 'completed' | 'stopped'
export type ExperimentSource = 'manual' | 'csv' | 'optimizely' | 'webhook' | 'api'
export type UserRole = 'admin' | 'editor' | 'viewer'
export type WorkspacePlan = 'starter' | 'growth' | 'enterprise'
export type EmbeddingStatus = 'pending' | 'processing' | 'done' | 'error'

export interface ExperimentVariant {
  name: string
  description?: string
  is_control: boolean
}

export interface ExperimentMetric {
  name: string
  type: string
  baseline?: number
  target?: number
}

export interface ApiResponse<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: {
    code: string
    message: string
  }
}
