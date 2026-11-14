/**
 * Thin HTTP client for the MailOps FastAPI backend.
 *
 * Set NEXT_PUBLIC_API_BASE_URL (e.g. https://api.mailops.io) to talk to a real
 * backend. When it is not set, services fall back to the in-browser mock layer.
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? ""
export const USE_MOCK = API_BASE_URL === ""

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

const toCamelKey = (key: string) => key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
const toSnakeKey = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)

function transformKeys(value: unknown, transform: (key: string) => string): unknown {
  if (Array.isArray(value)) return value.map((item) => transformKeys(item, transform))
  if (value && typeof value === "object" && value.constructor === Object) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [transform(k), transformKeys(v, transform)]),
    )
  }
  return value
}

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE"

interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
  signal?: AbortSignal
}

export async function http<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`)
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(toSnakeKey(key), String(value))
  }

  const headers: HeadersInit = { Accept: "application/json" }
  if (options.body !== undefined) headers["Content-Type"] = "application/json"
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      credentials: "include",
      signal: options.signal,
      body: options.body !== undefined ? JSON.stringify(transformKeys(options.body, toSnakeKey)) : undefined,
    })
  } catch {
    throw new ApiError("Unable to reach the MailOps API. Check your connection and try again.", 0)
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const data = await response.json()
      if (typeof data?.detail === "string") message = data.detail
      else if (Array.isArray(data?.detail) && data.detail[0]?.msg) message = data.detail[0].msg
    } catch {
      // Non-JSON error body; keep the generic message.
    }
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) return undefined as T
  return transformKeys(await response.json(), toCamelKey) as T
}
