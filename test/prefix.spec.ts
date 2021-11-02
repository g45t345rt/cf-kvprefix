import test from 'ava'
import { nanoid } from 'nanoid'

import Prefix from '../src/prefix'
import { mockUser, mockUsers, TestContext, User } from './mock'

test(`getDataPrefix`, (t) => {
  const users = new Prefix<User>(`users`)
  t.is(users.getDataPrefix(), `users::key::`)
})

test(`getIndexPrefix`, (t) => {
  const users = new Prefix<User>(`users`)
  const indexUsername = users.setIndex(`username`, {
    keyValue: (data) => data.username
  })

  t.is(users.getIndexPrefix(indexUsername), `users::username::`)
})

test(`createDataKey`, (t) => {
  const userKey = nanoid()
  const users = new Prefix<User>(`users`)

  t.deepEqual(users.createDataKey(userKey), `users::key::${userKey}`)
})

test(`createIndexDataKey`, async (t) => {
  const [key, user] = mockUser()
  const users = new Prefix<User>(`users`)
  const indexUsername = users.setIndex(`username`, {
    keyValue: (data) => data.username
  })

  t.is(users.createIndexDataKey(indexUsername, user, key), `users::username::${user.username}`)

  const reverseNumber = (value: number) => (253433854800000 - value).toString()
  const indexCreatedAtDesc = users.setIndex(`createAt_desc`, {
    sortValue: (data) => reverseNumber(data.createdAt)
  })

  t.is(users.createIndexDataKey(indexCreatedAtDesc, user, key), `users::createAt_desc::${reverseNumber(user.createdAt)}::${key}`)
})

test(`setIndex/getIndex/listIndex`, async (t) => {
  const users = new Prefix<User>(`users`)

  const indexUsername = users.setIndex(`username`, {
    keyValue: (data) => data.username
  })

  t.deepEqual(users.getIndex(`username`), indexUsername)
  t.deepEqual(users.listIndex(), [indexUsername])
})

test('getDataPrefixes', async (t) => {
  const usersPrefix = new Prefix<User>(`users`)

  usersPrefix.setIndex(`username`, {
    keyValue: (data) => data.username
  })

  const createdAtIndex = usersPrefix.setIndex(`createAt_desc`, {
    sortValue: (data) => (253433854800000 - data.createdAt).toString()
  })

  usersPrefix.setIndex(`active`, {
    filter: (data) => data.active
  })

  const userMap = mockUsers(10)

  const [key, user] = userMap.entries().next().value
  const prefixes = usersPrefix.getDataPrefixes(key, user)

  const expectedPrefix = [
    `users::key::${key}`,
    `users::username::${user.username}`,
    `users::createAt_desc::${createdAtIndex.definition.sortValue(user)}::${key}`,
  ]

  user.active && expectedPrefix.push(`users::active::${key}`)
  t.deepEqual(prefixes, expectedPrefix)
})
