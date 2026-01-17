import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { assertNotDemo } from './auth'

const ingredientValidator = v.object({
  _id: v.id('ingredients'),
  _creationTime: v.number(),
  name: v.string(),
  normalizedName: v.string(),
  aliases: v.optional(v.array(v.string())),
  category: v.string(),
  isStaple: v.boolean(),
  defaultUnit: v.string(),
})

export const list = query({
  args: {},
  returns: v.array(ingredientValidator),
  handler: async (ctx) => {
    return await ctx.db.query('ingredients').collect()
  },
})

export const search = query({
  args: { query: v.string() },
  returns: v.array(ingredientValidator),
  handler: async (ctx, args) => {
    const normalized = args.query.toLowerCase().trim()
    if (!normalized) return []
    const byName = await ctx.db
      .query('ingredients')
      .withIndex('by_normalizedName', (q) =>
        q
          .gte('normalizedName', normalized)
          .lt('normalizedName', normalized + '\uffff'),
      )
      .collect()
    const byNameIds = new Set(byName.map((i) => i._id))
    const all = await ctx.db.query('ingredients').collect()
    const byAlias = all.filter(
      (i) =>
        !byNameIds.has(i._id) &&
        i.aliases?.some((a) => a.toLowerCase().includes(normalized)),
    )
    return [...byName, ...byAlias]
  },
})

export const findByText = query({
  args: { text: v.string() },
  returns: v.union(ingredientValidator, v.null()),
  handler: async (ctx, args) => {
    const normalized = args.text.toLowerCase().trim()
    if (!normalized) return null
    const all = await ctx.db.query('ingredients').collect()
    return (
      all.find(
        (i) =>
          i.normalizedName === normalized ||
          (i.aliases && i.aliases.some((a) => a.toLowerCase() === normalized)),
      ) ?? null
    )
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
  returns: v.id('ingredients'),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    await assertNotDemo(ctx, 'Creating ingredients')
    const trimmedName = args.name.trim()
    if (!trimmedName) {
      throw new Error('Ingredient name cannot be empty')
    }
    const normalizedName = trimmedName.toLowerCase()
    return await ctx.db.insert('ingredients', {
      name: trimmedName,
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
    id: v.id('ingredients'),
    name: v.optional(v.string()),
    aliases: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    isStaple: v.optional(v.boolean()),
    defaultUnit: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    await assertNotDemo(ctx, 'Editing ingredients')
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new Error('Ingredient not found')
    }
    const { id, ...updates } = args
    const patch: Record<string, unknown> = {}
    if (updates.name !== undefined) {
      patch.name = updates.name
      patch.normalizedName = updates.name.toLowerCase().trim()
    }
    if (updates.aliases !== undefined) patch.aliases = updates.aliases
    if (updates.category !== undefined) patch.category = updates.category
    if (updates.isStaple !== undefined) patch.isStaple = updates.isStaple
    if (updates.defaultUnit !== undefined)
      patch.defaultUnit = updates.defaultUnit
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(id, patch)
    }
    return null
  },
})

export const addAlias = mutation({
  args: {
    id: v.id('ingredients'),
    alias: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    await assertNotDemo(ctx, 'Editing ingredients')
    const ingredient = await ctx.db.get(args.id)
    if (!ingredient) throw new Error('Ingredient not found')
    const normalizedAlias = args.alias.toLowerCase().trim()
    const currentAliases = ingredient.aliases ?? []
    if (!currentAliases.some((a) => a.toLowerCase() === normalizedAlias)) {
      await ctx.db.patch(args.id, {
        aliases: [...currentAliases, args.alias],
      })
    }
    return null
  },
})

export const remove = mutation({
  args: { id: v.id('ingredients') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    await assertNotDemo(ctx, 'Deleting ingredients')
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new Error('Ingredient not found')
    }
    await ctx.db.delete(args.id)
    return null
  },
})
