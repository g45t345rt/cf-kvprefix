import CFApi, { ListOptions, ListResponse, Response } from './CFApi'
import { KVStackDelete, KVStackWrite } from './KVStackFetch'

export default class KVNamespaceApi {
  namespaceId: string
  cfApi: CFApi

  constructor(namespaceId: string, cfApi: CFApi) {
    this.namespaceId = namespaceId
    this.cfApi = cfApi
  }

  beginStackWrite = (chunkSize?: number) => new KVStackWrite(this, chunkSize)

  beginStackDelete = (chunkSize?: number) => new KVStackDelete(this, chunkSize)

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

  readKeyValue = async (key: string): Promise<Response<void>> => {
    const { cfApi, namespaceId } = this

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${cfApi.accountId}/storage/kv/namespaces/${namespaceId}/values/${key}`

    const init = {
      method: 'GET',
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