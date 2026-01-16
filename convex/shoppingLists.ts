import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'

const itemValidator = v.object({
  ingredientId: v.id('ingredients'),
  quantity: v.number(),
  unit: v.string(),
  checked: v.boolean(),
})

const shoppingListValidator = v.object({
  _id: v.id('shoppingLists'),
  _creationTime: v.number(),
  userId: v.string(),
  name: v.string(),
  items: v.array(itemValidator),
})

export const list = query({
  args: {},
  returns: v.array(shoppingListValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    return await ctx.db
      .query('shoppingLists')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect()
  },
})

export const get = query({
  args: { id: v.id('shoppingLists') },
  returns: v.union(shoppingListValidator, v.null()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    const list = await ctx.db.get(args.id)
    if (!list || list.userId !== identity.subject) return null
    return list
  },
})

export const create = mutation({
  args: { name: v.string() },
  returns: v.id('shoppingLists'),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    return await ctx.db.insert('shoppingLists', {
      userId: identity.subject,
      name: args.name,
      items: [],
    })
  },
})

export const addItems = mutation({
  args: {
    id: v.id('shoppingLists'),
    items: v.array(
      v.object({
        ingredientId: v.id('ingredients'),
        quantity: v.number(),
        unit: v.string(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const list = await ctx.db.get(args.id)
    if (!list) throw new Error('Shopping list not found')
    if (list.userId !== identity.subject) throw new Error('Not authorized')

    for (const item of args.items) {
      if (item.quantity < 0) {
        throw new Error('Quantity cannot be negative')
      }
    }

    const newItems = args.items.map((item) => ({
      ...item,
      checked: false,
    }))

    await ctx.db.patch(args.id, {
      items: [...list.items, ...newItems],
    })
    return null
  },
})

export const toggleItem = mutation({
  args: {
    listId: v.id('shoppingLists'),
    itemIndex: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const list = await ctx.db.get(args.listId)
    if (!list) throw new Error('Shopping list not found')
    if (list.userId !== identity.subject) throw new Error('Not authorized')

    const index = Math.floor(args.itemIndex)
    if (index < 0 || index >= list.items.length) {
      throw new Error('Invalid item index')
    }

    const item = list.items[index]
    const wasChecked = item.checked
    const nowChecked = !wasChecked

    const items = [...list.items]
    items[index] = {
      ...item,
      checked: nowChecked,
    }

    await ctx.db.patch(args.listId, { items })

    if (nowChecked) {
      await ctx.scheduler.runAfter(0, internal.pantry.addToPantry, {
        userId: identity.subject,
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        unit: item.unit,
      })
    }

    return null
  },
})

export const removeItem = mutation({
  args: {
    listId: v.id('shoppingLists'),
    itemIndex: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const list = await ctx.db.get(args.listId)
    if (!list) throw new Error('Shopping list not found')
    if (list.userId !== identity.subject) throw new Error('Not authorized')

    const index = Math.floor(args.itemIndex)
    if (index < 0 || index >= list.items.length) {
      throw new Error('Invalid item index')
    }

    const items = list.items.filter((_, i) => i !== index)
    await ctx.db.patch(args.listId, { items })
    return null
  },
})

export const remove = mutation({
  args: { id: v.id('shoppingLists') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new Error('Shopping list not found')
    }
    if (existing.userId !== identity.subject) throw new Error('Not authorized')
    await ctx.db.delete(args.id)
    return null
  },
})
