import anyTest, { TestInterface } from 'ava'
import { Miniflare } from 'miniflare'

import Prefix from '../src/prefix'
import KVPrefix from '../src/KVPrefix'
import { mockUsers, TestContext, User } from './mock'

const test = anyTest as TestInterface<TestContext>

test.beforeEach(async (t) => {
  const mf = new Miniflare({
    script: `
    addEventListener("fetch", (event) => {
      // dummy script to use kv
      event.respondWith(new Response());
    });
    `,
    buildCommand: undefined,
  })

  t.context.mf = mf
  t.context.kv = await mf.getKVNamespace('DATA') as unknown as KVNamespace
})

test('kvprefix putData/getData/listData/deleteData', async (t) => {
  const { kv } = t.context

  const usersPrefix = new Prefix<User>(`users`)
  const users = new KVPrefix<User>(kv, usersPrefix)
  const userMap = mockUsers(10)

  // Insert keys
  for (const [key, user] of userMap) {
    await users.putData(key, user)
  }

  // Check if we can get the first user
  const [key, user] = userMap.entries().next().value
  let kvUser = await users.getData(key)
  t.is(kvUser, user)

  let list = await users.listData()

  // Test if all keys were inserted
  const allKeysExists = [...userMap].every(([key]) => {
    return list.data.find(item => item.key === key)
  })

  t.assert(allKeysExists)

  // Test listData() with limit zero
  const err = await t.throwsAsync(users.listData({ limit: 0 }), { instanceOf: TypeError })
  t.is(err.message, `Invalid limit: expected number > 0, got 0`)

  // Test listDate() with limit of 5
  list = await users.listData({ limit: 5 })
  t.is(list.data.length, 5)
  t.assert(list.cursor)
  t.false(list.complete)
  list = await users.listData({ limit: 5, cursor: list.cursor })
  t.true(list.complete)

  // Test deleteData()
  await users.deleteData(key)
  kvUser = await users.getData(key)
  t.is(kvUser, null)
})

test('kvprefix index data manipulation', async (t) => {
  const { kv } = t.context

  const usersPrefix = new Prefix<User>(`users`)

  usersPrefix.setIndex(`username`, {
    keyValue: (data) => data.username
  })

  usersPrefix.setIndex(`createAt_desc`, {
    sortValue: (data) => (253433854800000 - data.createdAt).toString()
  })

  usersPrefix.setIndex(`active`, {
    filter: (data) => data.active
  })

  usersPrefix.setIndex(`year`, {
    sortValue: (data) => new Date(data.createdAt).getFullYear().toString()
  })

  const users = new KVPrefix<User>(kv, usersPrefix)
  const userMap = mockUsers(10)

  // Insert keys after setting indexes
  for (const [key, user] of userMap) {
    await users.putData(key, user)
  }

  const [key, user] = userMap.entries().next().value

  // Find user by username
  const userByUsername = await users.getData(user.username, `username`)
  t.is(userByUsername, user)

  // Default list with indexes
  let list = await users.listData()
  // list will contains all indexes + keys
  // you can use 'key' index
  //t.is(list.data.length, userMap.size)

  // Sort users by created date
  list = await users.listData({ indexKey: `createAt_desc` })
  const sortedUsers = [...userMap].sort(([, a], [, b]) => b.createdAt - a.createdAt)
  t.deepEqual(list.data.map(({ value }) => new Date(value.createdAt)), sortedUsers.map(([_, user]) => new Date(user.createdAt)))

  // Active users
  list = await users.listData({ indexKey: `active` })
  t.deepEqual(list.data.length, [...userMap].filter(([_, user]) => user.active).length)

  // Users this year
  const year = 2021
  list = await users.listData({ indexKey: `year::${year}` })
  const usersIn2021 = [...userMap].filter(([_, user]) => new Date(user.createdAt).getFullYear() === year)
  const allKeysExists = usersIn2021.every(([key, user]) => {
    return list.data.find(item => {
      return item.key === key
    })
  })
  t.assert(allKeysExists, `Users by year don't match`)
})

test('test waitUntil', async (t) => {
  const mf = new Miniflare({
    modules: true,
    scriptPath: './test/waitUntil.mjs',
    kvNamespaces: ["TEST_NAMESPACE"],

  })
  
  // const kv = await mf.getKVNamespace("TEST_NAMESPACE")
  const res = await mf.dispatchFetch("http://localhost:8787/")
  const waitUntil = await res.waitUntil()

  // waitUntil should be 6 because we have 3 index to insert and 3 index to delete after => check waitUntil.mjs
  t.is(waitUntil.length, 6)
})
