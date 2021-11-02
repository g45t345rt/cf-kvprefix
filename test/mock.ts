import { KVStorageNamespace, Miniflare } from 'miniflare'
import { nanoid } from 'nanoid'
import faker from 'faker'

export interface TestContext {
  mf: Miniflare
  kv: KVNamespace
}

export interface User {
  username: string
  email: string
  active: boolean
  points: number
  createdAt: number
}

const toUnix = (date: Date) => new Date(date).getTime()

export const mockUser = (): [string, User] => {
  const key = nanoid()
  const user = {
    username: faker.internet.userName(),
    email: faker.internet.email(),
    points: Math.random() * 100,
    active: faker.datatype.boolean(),
    createdAt: toUnix(faker.date.recent(1000))
  } as User

  return [key, user]
}

export const mockUsers = (limit: number) => {
  const users = new Map<string, User>()
  for (let i = 0; i < limit; i++) {
    const [key, user] = mockUser()
    users.set(key, user)
  }
  return users
}
