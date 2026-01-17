import type { Auth } from 'convex/server'

type UserRole = 'demo' | 'user' | 'admin'

export const getUserRole = async (ctx: { auth: Auth }): Promise<UserRole> => {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return 'user'
  const role = (identity as Record<string, unknown>)['role'] as string | undefined
  return role === 'demo' || role === 'admin' ? role : 'user'
}

export const assertNotDemo = async (ctx: { auth: Auth }, action: string) => {
  const role = await getUserRole(ctx)
  if (role === 'demo') {
    throw new Error(`${action} is disabled for demo accounts`)
  }
}
