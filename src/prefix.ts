interface IndexDefinition<T> {
  filter?: (data: T) => boolean
  sortValue?: (data: T) => string
  keyValue?: (data: T) => string
}

interface Index<T> {
  key: string
  definition: IndexDefinition<T>
}

export default class Prefix<T> {
  name: string
  private indexes: {}

  constructor(name: string) {
    this.name = name
    this.indexes = {}
  }

  getDataPrefix = () => `${this.name}::key::`

  getIndexPrefix = (index: Index<T>) => `${this.name}::${index.key}::`

  createDataKey = (key: string) => `${this.getDataPrefix()}${key}`

  createIndexDataKey = (index: Index<T>, data: T, key: string) => {
    const { sortValue, keyValue } = index.definition
    let keys = [this.name, index.key]
    if (typeof sortValue === 'function') keys = [...keys, sortValue(data)]
    if (typeof keyValue === 'function') keys = [...keys, keyValue(data)]
    else keys = [...keys, key]

    return keys.join('::')
  }

  setIndex = (key: string, definition: IndexDefinition<T>): Index<T> => {
    this.indexes[key] = definition
    return { key, definition }
  }

  getIndex = (key: string): Index<T> => {
    return { key, definition: this.indexes[key] }
  }

  listIndex = (): Index<T>[] => {
    return Object.keys(this.indexes).map(key => this.getIndex(key))
  }

  getDataPrefixes = (key: string, data: T): string[] => {
    let prefixes = [this.createDataKey(key)]
    this.listIndex().forEach(index => {
      const { definition } = index
      const { filter } = definition
      if (typeof filter === 'function' && !filter(data)) return
      const indexDataKey = this.createIndexDataKey(index, data, key)
      prefixes = [...prefixes, indexDataKey]
    })

    return prefixes
  }
}
