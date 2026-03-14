const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'

type ApiSuccess<T> = { data: T; error: null }
type ApiError = { data: null; error: { code: string; message: string } }
type ApiResult<T> = ApiSuccess<T> | ApiError

async function fetchApi<T>(
  path: string,
  options?: RequestInit & { token?: string },
): Promise<ApiResult<T>> {
  const { token, ...fetchOptions } = options ?? {}

  const headers = new Headers(fetchOptions.headers)
  headers.set('Content-Type', 'application/json')

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      headers,
    })

    if (!response.ok) {
      let errorBody: { code?: string; message?: string } = {}
      try {
        errorBody = (await response.json()) as typeof errorBody
      } catch {
        // Non-JSON error body — leave defaults
      }
      return {
        data: null,
        error: {
          code: errorBody.code ?? `HTTP_${response.status}`,
          message: errorBody.message ?? `Request failed with status ${response.status}`,
        },
      }
    }

    if (response.status === 204) {
      return { data: null as unknown as T, error: null }
    }

    const data = (await response.json()) as T
    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    return {
      data: null,
      error: { code: 'NETWORK_ERROR', message },
    }
  }
}

export { fetchApi, API_BASE }
export type { ApiResult, ApiSuccess, ApiError }
