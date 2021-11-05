import { Response } from './CFApi'
import KVNamespaceApi from './KVNamespaceApi'

export class KVStackWrite {
  kvNamespaceApi: KVNamespaceApi
  chunkSize: number
  stack: Record<string, unknown>[]

  constructor(kvNamespaceApi: KVNamespaceApi, chunkSize?: number) {
    this.kvNamespaceApi = kvNamespaceApi
    this.chunkSize = chunkSize || 10000 // max of 10000 for cloudflare bulk insert
    this.stack = []
  }

  push = async (keyValues: Record<string, unknown>[]): Promise<Response<unknown>> => {
    this.stack = [...this.stack, ...keyValues]

    if (this.stack.length > this.chunkSize) {
      const _keyValues = this.stack.splice(0, this.chunkSize)
      return await this.kvNamespaceApi.writeKeyValues(_keyValues)
    }
  }

  pushRest = async (): Promise<Promise<unknown>> => {
    if (this.stack.length > 0) {
      const _keyValues = this.stack.splice(0)
      return await this.kvNamespaceApi.writeKeyValues(_keyValues)
    }
  }
}

export class KVStackDelete {
  kvNamespaceApi: KVNamespaceApi
  chunkSize: number
  stack: string[]

  constructor(kvNamespaceApi: KVNamespaceApi, chunkSize?: number) {
    this.kvNamespaceApi = kvNamespaceApi
    this.chunkSize = chunkSize || 10000
    this.stack = []
  }

  del = async (keys: string[]): Promise<Response<unknown>> => {
    this.stack = [...this.stack, ...keys]

    if (this.stack.length > this.chunkSize) {
      const _keys = this.stack.splice(0, this.chunkSize)
      return await this.kvNamespaceApi.deleteKeys(_keys)
    }
  }

  delRest = async (): Promise<Promise<unknown>> => {
    if (this.stack.length > 0) {
      const _keys = this.stack.splice(0)
      return await this.kvNamespaceApi.deleteKeys(_keys)
    }
  }
}
