import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

const ingredientValidator = v.object({
  _id: v.id("ingredients"),
  _creationTime: v.number(),
  name: v.string(),
  normalizedName: v.string(),
  aliases: v.array(v.string()),
  category: v.string(),
  isStaple: v.boolean(),
  defaultUnit: v.string(),
})

export const list = query({
  args: {},
  returns: v.array(ingredientValidator),
  handler: async (ctx) => {
    return await ctx.db.query("ingredients").collect()
  },
})

export const search = query({
  args: { query: v.string() },
  returns: v.array(ingredientValidator),
  handler: async (ctx, args) => {
    const normalized = args.query.toLowerCase().trim()
    if (!normalized) return []
    const all = await ctx.db.query("ingredients").collect()
    return all.filter((i) =>
      i.normalizedName.includes(normalized) ||
      i.aliases.some((a) => a.toLowerCase().includes(normalized))
    )
  },
})

export const findByText = query({
  args: { text: v.string() },
  returns: v.union(ingredientValidator, v.null()),
  handler: async (ctx, args) => {
    const normalized = args.text.toLowerCase().trim()
    if (!normalized) return null
    const all = await ctx.db.query("ingredients").collect()
    return all.find((i) =>
      i.normalizedName === normalized ||
      i.aliases.some((a) => a.toLowerCase() === normalized)
    ) ?? null
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    aliases: v.optional(v.array(v.string())),
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
      aliases: args.aliases ?? [],
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
    aliases: v.optional(v.array(v.string())),
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
    if (updates.aliases !== undefined) patch.aliases = updates.aliases
    if (updates.category !== undefined) patch.category = updates.category
    if (updates.isStaple !== undefined) patch.isStaple = updates.isStaple
    if (updates.defaultUnit !== undefined) patch.defaultUnit = updates.defaultUnit
    await ctx.db.patch(id, patch)
    return null
  },
})

export const addAlias = mutation({
  args: {
    id: v.id("ingredients"),
    alias: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ingredient = await ctx.db.get(args.id)
    if (!ingredient) throw new Error("Ingredient not found")
    const normalizedAlias = args.alias.toLowerCase().trim()
    if (!ingredient.aliases.some((a) => a.toLowerCase() === normalizedAlias)) {
      await ctx.db.patch(args.id, {
        aliases: [...ingredient.aliases, args.alias],
      })
    }
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
