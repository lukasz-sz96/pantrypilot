import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("ingredients"),
      _creationTime: v.number(),
      name: v.string(),
      normalizedName: v.string(),
      category: v.string(),
      isStaple: v.boolean(),
      defaultUnit: v.string(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("ingredients").collect()
  },
})

export const search = query({
  args: { query: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("ingredients"),
      _creationTime: v.number(),
      name: v.string(),
      normalizedName: v.string(),
      category: v.string(),
      isStaple: v.boolean(),
      defaultUnit: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const normalized = args.query.toLowerCase().trim()
    if (!normalized) return []
    const all = await ctx.db.query("ingredients").collect()
    return all.filter((i) => i.normalizedName.includes(normalized))
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    isStaple: v.boolean(),
    defaultUnit: v.string(),
  },
  returns: v.id("ingredients"),
  handler: async (ctx, args) => {
    const normalizedName = args.name.toLowerCase().trim()
    return await ctx.db.insert("ingredients", {
      name: args.name,
      normalizedName,
      category: args.category,
      isStaple: args.isStaple,
      defaultUnit: args.defaultUnit,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id("ingredients"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    isStaple: v.optional(v.boolean()),
    defaultUnit: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    const patch: Record<string, unknown> = {}
    if (updates.name !== undefined) {
      patch.name = updates.name
      patch.normalizedName = updates.name.toLowerCase().trim()
    }
    if (updates.category !== undefined) patch.category = updates.category
    if (updates.isStaple !== undefined) patch.isStaple = updates.isStaple
    if (updates.defaultUnit !== undefined) patch.defaultUnit = updates.defaultUnit
    await ctx.db.patch(id, patch)
    return null
  },
})

export const remove = mutation({
  args: { id: v.id("ingredients") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return null
  },
})
