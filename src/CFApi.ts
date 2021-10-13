if (!globalThis.fetch) {
  throw new Error(`[fetch] is not defined. You are mostly using node and need a fetch polyfill like [isomorphic-fetch].`)
}

export interface CFApiOptions {
  authToken?: string
  xAuthApi?: string
  xAuthEmail?: string
  userAgent?: string
}

export interface PaginationOptions {
  page?: number
  perPage?: number
  order?: string
  direction?: string
}

export interface Response<T> {
  success: boolean
  errors: []
  messages: []
  result: T
}

export interface NamespaceInfo {
  id: string,
  title: string,
  supports_url_encoding: boolean
}

export interface ListOptions {
  limit?: number
  cursor?: string
  prefix?: string
}

export interface PutData {
  key: string
  value: string
  expiration?: number
  expiration_ttl?: number
  metadata?: unknown
  base64?: boolean
}

export interface ListItem {
  name: string
  metadata: unknown
  expiration: number
}

export interface ListResponse extends Response<ListItem[]> {
  result_info: {
    count: number
    cursor: string
  }
}

export class KVNamespaceApi {
  namespaceId: string
  cfApi: CFApi

  constructor(namespaceId: string, cfApi: CFApi) {
    this.namespaceId = namespaceId
    this.cfApi = cfApi
  }

  forEachBulkKeys = async (options: { chunkSize: number; prefix?: string }, onChunk: (data: any) => void) => {
    const { chunkSize, prefix } = options

    if (chunkSize < 1000 || chunkSize > 10000) throw new Error(`The [chunkSize] must be between 1000 and 10000.`)

    let cursor = ''
    let data = []
    while (cursor) {
      const { success, result, result_info, errors } = await this.listKeys({ prefix, cursor, limit: 1000 })
      if (!success) throw new Error(JSON.stringify(errors))
      if (result_info.cursor === '') cursor = null
      else cursor = result_info.cursor

      data = [...data, ...result]
      if (data.length > chunkSize || !cursor) {
        onChunk(result)
        data = []
      }
    }
  }

  deleteKeys = async (keys: string[]): Promise<Response<void>> => {
    const { cfApi, namespaceId } = this

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${cfApi.accountId}/storage/kv/namespaces/${namespaceId}/bulk`
    const init = {
      method: 'DELETE',
      headers: cfApi.baseHeaders(),
      body: JSON.stringify(keys)
    } as RequestInit

    try {
      const res = await fetch(endpoint, init)
      return await res.json()
    } catch (err) {
      return err
    }
  }

  writeKeyValues = async (keyValues: Record<string, unknown>[]): Promise<Response<void>> => {
    const { cfApi, namespaceId } = this

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${cfApi.accountId}/storage/kv/namespaces/${namespaceId}/bulk`
    const init = {
      method: 'PUT',
      headers: cfApi.baseHeaders(),
      body: JSON.stringify(keyValues)
    } as RequestInit

    try {
      const res = await fetch(endpoint, init)
      return await res.json()
    } catch (err) {
      return err
    }
  }

  listKeys = async (listOptions?: ListOptions): Promise<ListResponse> => {
    const { cfApi, namespaceId } = this

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${cfApi.accountId}/storage/kv/namespaces/${namespaceId}/keys`
    const init = {
      method: 'GET',
      params: listOptions,
      headers: cfApi.baseHeaders()
    } as RequestInit

    try {
      const res = await fetch(endpoint, init)
      return await res.json()
    } catch (err) {
      return err
    }
  }
}

export class CFApi {
  accountId: string
  options: CFApiOptions

  constructor(accountId: string, options: CFApiOptions) {
    this.accountId = accountId
    this.options = options
  }

  baseHeaders = () => {
    const { authToken, userAgent, xAuthApi, xAuthEmail } = this.options
    const headers = {} as HeadersInit

    if (authToken) headers['Authorization'] = `Bearer ${authToken}`
    if (userAgent) headers['User-Agent'] = userAgent
    if (xAuthApi) headers['X-Auth-Api'] = xAuthApi
    if (xAuthEmail) headers['X-Auth-Email'] = xAuthEmail

    headers['Content-Type'] = `application/json` // default to json request
    return headers
  }

  renameNamespace = async (id: string, newName: string): Promise<Response<void>> => {
    const { accountId } = this

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${id}`
    const init = {
      method: 'GET',
      headers: this.baseHeaders(),
      body: JSON.stringify({ title: newName })
    } as RequestInit

    try {
      const res = await fetch(endpoint, init)
      return await res.json()
    } catch (err) {
      return err
    }
  }

  listNamespaces = async (listOptions?: PaginationOptions): Promise<Response<NamespaceInfo[]>> => {
    const { accountId } = this

    const initParams = {} as Record<string, string>
    if (listOptions) {
      if (listOptions.direction) initParams['direction'] = listOptions.direction
      if (listOptions.order) initParams['order'] = listOptions.order
      if (listOptions.page) initParams['page'] = listOptions.page.toString()
      if (listOptions.perPage) initParams['per_page'] = listOptions.perPage.toString()
    }
    
    const params = new URLSearchParams(initParams)
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces?${params.toString()}`
    const init = {
      method: 'GET',
      headers: this.baseHeaders()
    } as RequestInit

    try {
      const res = await fetch(endpoint, init)
      return await res.json()
    } catch (err) {
      return err
    }
  }

  createNamespace = async (name: string): Promise<Response<NamespaceInfo>> => {
    const { accountId } = this

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces`
    const init = {
      method: 'POST',
      headers: this.baseHeaders(),
      body: JSON.stringify({ title: name })
    } as RequestInit

    try {
      const res = await fetch(endpoint, init)
      return await res.json()
    } catch (err) {
      return err
    }
  }

  removeNamespace = async (namespaceId: string): Promise<Response<void>> => {
    const { accountId } = this

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`
    const init = {
      method: 'DELETE',
      headers: this.baseHeaders()
    } as RequestInit

    try {
      const res = await fetch(endpoint, init)
      return await res.json()
    } catch (err) {
      return err
    }
  }

  useNamespace = (namespaceId: string): KVNamespaceApi => new KVNamespaceApi(namespaceId, this)
}
