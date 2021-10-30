# CF KVPrefix (experimental)

Store data normally with Cloudflare KV but with linked indexes.
Technically it handle `put` and `delete` of all linked keys.

## Why

KV is a key value store only! You can't create complex queries easily.
You have to duplicate the data for new query logic.
I created this simple package to handle duplicate data.
For example, removing the main key of a particular data will remove all linked keys.
Without this helper, you have to manually code and handle `put` and `delete` for each
duplicate data with different keys that are in relation with each other.

## How to use it

Use case

Let's say we have a list of users and we want to:

- Get all disabled users
- Check if username / email is taken
- Get latest created users
- Filter by role

```ts
import { Prefix, KVPrefix } from 'cf-kvprefix'

// The custom KV metadata
interface User {
  role: string
  username: string
  email: string
  disabled: boolean
  createdAt: number
}

// This create the prefixes/keys based on defined indexes
const usersPrefix = new Prefix<User>(`users`)

// Disabled index
usersPrefix.setIndex(`disabled`, {
  sortValue: (data) => data.disabled.toString()
})

// Username index
usersPrefix.setIndex(`username`, {
  keyValue: (data) => data.username
})

// Email index
usersPrefix.setIndex(`email`, {
  keyValue: (data) => data.email
})

// CreatedAt index
usersPrefix.setIndex(`createdAt_desc`, {
  sortValue: (data) => `${32503680000 - data.createdAt}` // Keys are always returned in lexicographically sorted order so we have to inverse the timestamp to get descending order
})

// Option 1: Admin role index
usersPrefix.setIndex(`admin`, {
  filter: (data) => data.role === 'admin'
})

// Option 2: Admin role index
usersPreix.setIndex(`role`, {
  sortValue: (data) => data.role
})

// Contain functions to put, delete or list data for all indexes defined
const kvUsers = new KVPrefix<User>(DATA, usersPrefix)

// Get all disabled users
const res = await kvUsers.list({ indexKey: 'disabled::true' })

// Check if username is taken
const res = await kvUsers.getData('{username}', 'username')

// Check if email is taken
const res = await kvUsers.getData('{email}', 'email')

// Get latest created users
const res = await kvUsers.list({ indexKey: 'createdAt_desc' })

// Option 1: Get admin users only
const res = await kvUsers.list({ indexKey: 'admin' })

// Option 2: Get admin users only
const res = await kvUsers.list({ indexKey: 'role::admin' })
const res = await kvUsers.list({ indexKey: 'role::user' })

```

## CLI

TODO

## Notes / Caveats

### Warning

No idea if this should be use in production app. I have no knowledge on how database create indexes or store data in relation with each other. Please, I welcome anyone for feedback or extensive knowledge about this subject. I feel that I'm missing a lot of things about storing data efficiently, and I want to make it better.

### Creating an index on existing data

You need to update all existing keys yourself if you are adding a new index in the code afterward.
CFApi can help you edit multiple keys at once efficiently.
TODO: The CLI will contain helpers to update indexes
