import 'isomorphic-fetch'

import test from 'ava'
import { nanoid } from 'nanoid'

import { CFApi } from '../src/CFApi'
import { mockUsers } from './mock'

test(`baseHeader worker/node`, (t) => {
  const accountId = nanoid()
  const authToken = nanoid()

  const cfApi = new CFApi(accountId, { authToken })

  t.deepEqual(cfApi.baseHeaders(), {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  })
})

test.skip('kvapi namespace list/multidelete/multiput', async (t) => {
  const cfApi = new CFApi('4dd2da39d9258e75acb8e5c4626bb669', {
    userAgent: 'vscode-node',
    authToken: '8CHSNJcdwTncfly08zZHhNPSAhagcHDOH6cBGMm6'
  })

  const userMap = mockUsers(10)

  const data = [...userMap].map(([key, user]) => {
    return { key, value: JSON.stringify(user), metadata: user }
  })

  const namespaceName = 'testing'
  const res1 = await cfApi.listNamespaces({ perPage: 100 })
  if (!res1.success) t.fail(JSON.stringify(res1))

  let namespace = res1.result.find((item) => item.title === namespaceName)
  if (!namespace) {
    const res2 = await cfApi.createNamespace(namespaceName)
    if (!res2.success) t.fail(JSON.stringify(res2))

    namespace = res2.result
  }

  const namespaceApi = cfApi.useNamespace(namespace.id)

  const res3 = await namespaceApi.writeKeyValues(data)
  if (!res3.success) t.fail(JSON.stringify(res3))

  const deletedKeys = [...userMap].slice(0, 5).map(([key]) => key)
  // Delete at least 5
  const res4 = await namespaceApi.deleteKeys(deletedKeys)
  if (!res4.success) t.fail(JSON.stringify(res4))

  const res5 = await namespaceApi.listKeys({ limit: 10 })
  if (!res5.success) t.fail(JSON.stringify(res5))

  const res6 = await cfApi.removeNamespace(namespace.id)
  if (!res6.success) t.fail(JSON.stringify(res6))

  t.assert(true)
})