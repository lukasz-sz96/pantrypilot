import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { assertNotDemo } from './auth'

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    await assertNotDemo(ctx, 'Uploading images')
    return await ctx.storage.generateUploadUrl()
  },
})

export const getImageUrl = mutation({
  args: { storageId: v.id('_storage') },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId)
  },
})
