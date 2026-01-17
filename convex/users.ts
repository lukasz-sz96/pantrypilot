import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { assertNotDemo } from './auth'

export const deleteAllData = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    await assertNotDemo(ctx, 'Deleting account')

    const userId = identity.subject

    const pantryItems = await ctx.db
      .query('pantryItems')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    for (const item of pantryItems) {
      await ctx.db.delete(item._id)
    }

    const recipes = await ctx.db
      .query('recipes')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    for (const recipe of recipes) {
      await ctx.db.delete(recipe._id)
    }

    const shoppingLists = await ctx.db
      .query('shoppingLists')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    for (const list of shoppingLists) {
      await ctx.db.delete(list._id)
    }

    return null
  },
})
