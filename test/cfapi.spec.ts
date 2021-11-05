import 'isomorphic-fetch'

import test from 'ava'
import { nanoid } from 'nanoid'
import dotenv from 'dotenv'

import CFApi from '../src/CFApi'
import { mockUsers } from './mock'

dotenv.config()

test(`baseHeader worker/node`, (t) => {
  const accountId = nanoid()
  const authToken = nanoid()

  const cfApi = new CFApi(accountId, { authToken })

  t.deepEqual(cfApi.baseHeaders(), {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  })
})

test.skip('kvapi namespace list/multidelete/multiput/stackwrite', async (t) => {
  const cfApi = new CFApi(process.env.CF_ACCOUNT_ID, {
    userAgent: 'vscode-node',
    authToken: process.env.CF_AUTH_TOKEN
  })

  // Check namespace + if testing namespace already exists
  const namespaceName = 'kvprefix_testing'
  const res1 = await cfApi.listNamespaces({ perPage: 100 })
  if (!res1.success) t.fail(JSON.stringify(res1))

  let namespace = res1.result.find((item) => item.title === namespaceName)
  if (!namespace) {
    // Create new testing namespace
    const res2 = await cfApi.createNamespace(namespaceName)
    if (!res2.success) t.fail(JSON.stringify(res2))

    namespace = res2.result
  }

  const namespaceApi = cfApi.useNamespace(namespace.id)

  // Mock new user data to manipulate
  const userMap = mockUsers(10)
  const data = [...userMap].map(([key, user]) => {
    return { key, value: JSON.stringify(user), metadata: user }
  })

  // Insert data in bulk
  const res3 = await namespaceApi.writeKeyValues(data)
  if (!res3.success) t.fail(JSON.stringify(res3))

  // Delete all keys
  const deletedKeys = [...userMap].map(([key]) => key)
  const res4 = await namespaceApi.deleteKeys(deletedKeys)
  if (!res4.success) t.fail(JSON.stringify(res4))

  // Check keys
  const res5 = await namespaceApi.listKeys({ limit: 10 })
  if (!res5.success) t.fail(JSON.stringify(res5))
  if (res5.result.length > 0) t.fail('Keys should be cleared')

  // Test stack write
  const stackWrite = namespaceApi.beginStackWrite(50)
  const iteration = 5
  const countPerPush = 22
  for (let i = 0; i < iteration; i++) {
    const newData = [...mockUsers(countPerPush)].map(([key, user]) => {
      return { key, value: JSON.stringify(user), metadata: user }
    })
    await stackWrite.push(newData)
  }

  await stackWrite.pushRest()

  // Check keys once again
  const res6 = await namespaceApi.listKeys({ limit: 1000 })
  if (!res6.success) t.fail(JSON.stringify(res6))
  if (res6.result.length !== (iteration * countPerPush)) t.fail('Key count does not match.')

  // Remove testing namespace
  const res7 = await cfApi.removeNamespace(namespace.id)
  if (!res7.success) t.fail(JSON.stringify(res7))

  t.assert(true)
})
