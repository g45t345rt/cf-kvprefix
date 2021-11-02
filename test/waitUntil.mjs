import KVPrefix from "../dist/KVPrefix.mjs"
import Prefix from "../dist/prefix.mjs"

const prefix = new Prefix('users')

prefix.setIndex(`username`, {
  keyValue: (data) => data.username
})

prefix.setIndex(`createAt_desc`, {
  sortValue: (data) => (253433854800000 - data.createdAt).toString()
})

prefix.setIndex(`active`, {
  filter: (data) => data.active
})

export default {
  async fetch(request, env, ctx) {
    const users = new KVPrefix(env.TEST_NAMESPACE, prefix, ctx)

    const key = `n3-4iufn34-fu3`
    await users.putData(key, {
      username: 'fred',
      active: true,
      createdAt: new Date().getTime() / 1000
    })

    await users.deleteData(key)

    return new Response()
  }
}