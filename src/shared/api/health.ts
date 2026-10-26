export type DependencyStatus = 'ok' | 'unavailable'

export interface HealthResponse {
  status: 'ok' | 'degraded'
  checks: Record<string, DependencyStatus>
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch('/api/v1/health', { signal })
  if (!response.ok && response.status !== 503) {
    throw new Error(`Health check failed with status ${response.status}`)
  }
  return (await response.json()) as HealthResponse
}
