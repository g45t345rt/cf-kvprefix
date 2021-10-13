import Prefix from './prefix'

interface PutOptions {
  expiration?: string | number
  expirationTtl?: string | number
}

interface ListOptions {
  indexKey?: string
  limit?: number
  cursor?: string
}

interface ListItem<T> {
  key: string
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

  constructor(kv: KVNamespace, prefix: Prefix<T>) {
    this.kv = kv
    this.prefix = prefix
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

    this.prefix.listIndex().forEach(index => {
      const { definition } = index
      const { filter } = definition
      const newIndexDataKey = this.prefix.createIndexDataKey(index, data, key)

      if (oldData) {
        const oldIndexDataKey = this.prefix.createIndexDataKey(index, oldData, key)
        if (oldIndexDataKey !== newIndexDataKey) {
          this.kv.delete(oldIndexDataKey)
        }
      }

      if (typeof filter === 'function' && !filter(data)) return
      this.kv.put(newIndexDataKey, JSON.stringify(data), { metadata: data, ...options })
    })
  }

  deleteData = async (key: string): Promise<boolean> => {
    const data = await this.getData(key)
    if (!data) return false

    await this.kv.delete(this.prefix.createDataKey(key))

    this.prefix.listIndex().forEach(index => {
      const indexDataKey = this.prefix.createIndexDataKey(index, data, key)
      this.kv.delete(indexDataKey)
    })

    return true
  }

  listData = async (options?: ListOptions): Promise<List<T>> => {
    const { indexKey, limit, cursor } = options || {}
    const listPrefix = [this.prefix.name, indexKey].join('::')

    const list = await this.kv.list({ prefix: listPrefix, limit, cursor })

    const data = list.keys.map(({ name, metadata, expiration }) => {
      const keys = name.split('::')
      const key = keys[keys.length - 1]

      const item = { key, value: metadata as T } as ListItem<T>
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
