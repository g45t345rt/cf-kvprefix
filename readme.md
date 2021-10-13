# CF KVPrefix (experimental)

Store data normally with Cloudflare Workers KV but linked indexes.

## Why

KV is a key value store only! You can't create complex queries. This code automatically handles defined indexes in your code.

## Examples

Simple index for being able to list all disabled users.

```ts
import { Prefix, KVPrefix } from 'cf-kvprefix'

interface User {
  username: string
  disabled: boolean
}

const usersPrefix = new Prefix<User>(`users`)

usersPrefix.setIndex(`disabled`, {
  sortValue: (data) => data.disabled.toString()
})

const kvUsers = new KVPrefix<User>(DATA, usersPrefix)

const res = await kvUsers.list({ indexKey: 'disabled::true' })
```
