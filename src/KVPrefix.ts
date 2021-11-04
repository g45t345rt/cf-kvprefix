import Prefix from './prefix'

export interface PutOptions {
  expiration?: number
  expirationTtl?: number
}

export interface ListOptions {
  indexKey?: string
  limit?: number
  cursor?: string
}

interface ListItem<T> {
  key: string
  fullKey: string
  expiration?: number
  value?: T
}

interface List<T> {
  complete: boolean
  cursor?: string
  data: ListItem<T>[]
}

export default class KVPrefix<T> {
  private prefix: Prefix<T>
  private kv: KVNamespace
  private ctx?: any

  constructor(kv: KVNamespace, prefix: Prefix<T>, ctx?: any) {
    this.kv = kv
    this.prefix = prefix
    this.ctx = ctx // use cf context instead of passing waitUntil -- avoid illegal invocation on live servers
  }

  getData = async (key: string, indexKey?: string): Promise<T> => {
    let keys = [this.prefix.name]
    if (indexKey) keys = [...keys, indexKey, key]
    else keys = [...keys, 'key', key]
    const joinKey = keys.join('::')
    const { metadata } = await this.kv.getWithMetadata(joinKey, 'json')
    return metadata as T
  }

  putData = async (key: string, data: T, options: PutOptions = {}) => {
    const oldData = await this.getData(key)
    await this.kv.put(this.prefix.createDataKey(key), JSON.stringify(data), { metadata: data, ...options })

    const indexes = this.prefix.listIndex()
    for (let i = 0; i < indexes.length; i++) {
      const index = indexes[i]
      const { definition } = index
      const { filter } = definition
      const newIndexDataKey = this.prefix.createIndexDataKey(index, data, key)

      if (oldData) {
        const oldIndexDataKey = this.prefix.createIndexDataKey(index, oldData, key)
        if (oldIndexDataKey !== newIndexDataKey) {
          const deletePromise = this.kv.delete(oldIndexDataKey)
          if (this.ctx) this.ctx.waitUntil(deletePromise)
          else await deletePromise
        }
      }

      if (typeof filter === 'function' && !filter(data)) continue // skip put

      const putPromise = this.kv.put(newIndexDataKey, JSON.stringify(data), { metadata: data, ...options })
      if (this.ctx) this.ctx.waitUntil(putPromise)
      else await putPromise
    }
  }

  deleteData = async (key: string): Promise<boolean> => {
    const data = await this.getData(key)
    if (!data) return false

    await this.kv.delete(this.prefix.createDataKey(key))

    const indexes = this.prefix.listIndex()
    for (let i = 0; i < indexes.length; i++) {
      const index = indexes[i]
      const indexDataKey = this.prefix.createIndexDataKey(index, data, key)
      const deletePromise = this.kv.delete(indexDataKey)
      if (this.ctx) this.ctx.waitUntil(deletePromise)
      else await deletePromise
    }

    return true
  }

  listData = async (options?: ListOptions): Promise<List<T>> => {
    const { indexKey, limit, cursor } = options || {}
    const listPrefix = [this.prefix.name, indexKey].join('::')

    const list = await this.kv.list({ prefix: listPrefix, limit, cursor })

    const data = list.keys.map(({ name, metadata, expiration }) => {
      const keys = name.split('::')
      const key = keys[keys.length - 1]

      const item = { key, fullKey: name, value: metadata as T } as ListItem<T>
      if (expiration) item.expiration = expiration
      return item
    })

    return {
      complete: list.list_complete,
      cursor: list.cursor,
      data
    }
  }
}
