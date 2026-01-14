import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

const itemValidator = v.object({
  ingredientId: v.id("ingredients"),
  quantity: v.number(),
  unit: v.string(),
  checked: v.boolean(),
})

const shoppingListValidator = v.object({
  _id: v.id("shoppingLists"),
  _creationTime: v.number(),
  name: v.string(),
  items: v.array(itemValidator),
})

export const list = query({
  args: {},
  returns: v.array(shoppingListValidator),
  handler: async (ctx) => {
    return await ctx.db.query("shoppingLists").collect()
  },
})

export const get = query({
  args: { id: v.id("shoppingLists") },
  returns: v.union(shoppingListValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

export const create = mutation({
  args: { name: v.string() },
  returns: v.id("shoppingLists"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("shoppingLists", {
      name: args.name,
      items: [],
    })
  },
})

export const addItems = mutation({
  args: {
    id: v.id("shoppingLists"),
    items: v.array(
      v.object({
        ingredientId: v.id("ingredients"),
        quantity: v.number(),
        unit: v.string(),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.id)
    if (!list) throw new Error("Shopping list not found")

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
    listId: v.id("shoppingLists"),
    itemIndex: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId)
    if (!list) throw new Error("Shopping list not found")

    const items = [...list.items]
    if (args.itemIndex >= 0 && args.itemIndex < items.length) {
      items[args.itemIndex] = {
        ...items[args.itemIndex],
        checked: !items[args.itemIndex].checked,
      }
    }

    await ctx.db.patch(args.listId, { items })
    return null
  },
})

export const removeItem = mutation({
  args: {
    listId: v.id("shoppingLists"),
    itemIndex: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId)
    if (!list) throw new Error("Shopping list not found")

    const items = list.items.filter((_, i) => i !== args.itemIndex)
    await ctx.db.patch(args.listId, { items })
    return null
  },
})

export const remove = mutation({
  args: { id: v.id("shoppingLists") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return null
  },
})
