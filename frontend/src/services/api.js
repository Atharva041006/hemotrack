const API_ROOT = import.meta.env.VITE_API_URL || '/api'

export class ApiError extends Error {
  constructor(message, status, code) { super(message); this.status = status; this.code = code }
}

export async function apiRequest(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      ...options,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    })
  } catch {
    throw new ApiError('The HemoTrack API is not reachable. Demo session data remains available.', 0, 'API_UNAVAILABLE')
  }
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new ApiError('The HemoTrack API returned an unexpected response. Demo session data remains available.', response.status, 'INVALID_API_RESPONSE')
  }
  const body = await response.json().catch(() => {
    throw new ApiError('The HemoTrack API returned invalid JSON. Demo session data remains available.', response.status, 'INVALID_API_RESPONSE')
  })
  if (!response.ok) throw new ApiError(body.error?.message || 'The request could not be completed.', response.status, body.error?.code)
  return body.data ?? body
}

export const api = {
  health: () => apiRequest('/health/ready'),
  donors: {
    list: () => apiRequest('/donors'),
    create: (values) => apiRequest('/donors', { method: 'POST', body: JSON.stringify(values) }),
    update: (id, values) => apiRequest(`/donors/${id}`, { method: 'PUT', body: JSON.stringify(values) }),
  },
  donations: {
    list: () => apiRequest('/donations'),
    create: (values) => apiRequest('/donations', { method: 'POST', body: JSON.stringify(values) }),
    setStatus: (id, values) => apiRequest(`/donations/${id}/status`, { method: 'PATCH', body: JSON.stringify(values) }),
  },
  inventory: (filters = {}) => apiRequest(`/inventory${new URLSearchParams(filters).size ? `?${new URLSearchParams(filters)}` : ''}`),
  requests: {
    list: (status = '') => apiRequest(`/requests${status ? `?status=${encodeURIComponent(status)}` : ''}`),
    create: (values) => apiRequest('/requests', { method: 'POST', body: JSON.stringify(values) }),
    setStatus: (id, status) => apiRequest(`/requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },
  issues: {
    list: () => apiRequest('/issues'),
    create: (values) => apiRequest('/issues', { method: 'POST', body: JSON.stringify(values) }),
  },
  reports: { summary: () => apiRequest('/reports/summary') },
  dashboard: () => apiRequest('/dashboard'),
}
