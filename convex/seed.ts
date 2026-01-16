import { action, internalMutation, internalQuery } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'
import seedData from './seedData.json'

const CATEGORY_MAP: Record<string, string> = {
  Asian: 'Asian',
  Breads: 'Breads',
  Breakfast: 'Breakfast',
  Desserts: 'Desserts',
  Italian: 'Italian',
  Lunches: 'Lunches',
  Main: 'Main',
  Mexican: 'Mexican',
  Sides: 'Sides',
  'Soups & Stews': 'Soups & Stews',
  Vegetarian: 'Vegetarian',
}

export const seedTemplateRecipes = action({
  args: {},
  returns: v.object({
    seeded: v.number(),
    skipped: v.boolean(),
  }),
  handler: async (ctx) => {
    const existingCount = await ctx.runQuery(internal.seed.countTemplates)
    if (existingCount > 0) {
      return { seeded: 0, skipped: true }
    }

    let seeded = 0
    const recipes = seedData.recipes as Array<{
      title: string
      category: string
      cooklangSource: string
      parsedIngredients: Array<{
        originalText: string
        quantity?: number
        unit?: string
      }>
      parsedSteps: Array<string>
      servings?: number
      image?: string
      sourceUrl?: string
    }>

    for (const recipe of recipes) {
      await ctx.runMutation(internal.seed.insertTemplate, {
        title: recipe.title,
        cooklangSource: recipe.cooklangSource,
        parsedIngredients: recipe.parsedIngredients,
        parsedSteps: recipe.parsedSteps,
        servings: recipe.servings,
        category: CATEGORY_MAP[recipe.category] || recipe.category,
        image: recipe.image,
        sourceUrl: recipe.sourceUrl,
      })
      seeded++
    }

    for (const category of Object.values(CATEGORY_MAP)) {
      await ctx.runMutation(internal.seed.insertCategory, { name: category })
    }

    return { seeded, skipped: false }
  },
})

export const countTemplates = internalQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const templates = await ctx.db.query('templateRecipes').collect()
    return templates.length
  },
})

export const insertTemplate = internalMutation({
  args: {
    title: v.string(),
    cooklangSource: v.string(),
    parsedIngredients: v.array(
      v.object({
        originalText: v.string(),
        quantity: v.optional(v.number()),
        unit: v.optional(v.string()),
      }),
    ),
    parsedSteps: v.array(v.string()),
    servings: v.optional(v.number()),
    category: v.optional(v.string()),
    image: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  },
  returns: v.id('templateRecipes'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('templateRecipes', {
      title: args.title,
      cooklangSource: args.cooklangSource,
      parsedIngredients: args.parsedIngredients,
      parsedSteps: args.parsedSteps,
      servings: args.servings,
      category: args.category,
      sourceUrl: args.sourceUrl,
    })
  },
})

export const insertCategory = internalMutation({
  args: { name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const slug = args.name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')
    const existing = await ctx.db
      .query('categories')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .first()
    if (!existing) {
      await ctx.db.insert('categories', { name: args.name, slug })
    }
    return null
  },
})

export const countUserRecipes = internalQuery({
  args: { userId: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const recipes = await ctx.db
      .query('recipes')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()
    return recipes.length
  },
})

export const listTemplates = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('templateRecipes'),
      title: v.string(),
      cooklangSource: v.string(),
      parsedIngredients: v.array(
        v.object({
          originalText: v.string(),
          quantity: v.optional(v.number()),
          unit: v.optional(v.string()),
        }),
      ),
      parsedSteps: v.array(v.string()),
      servings: v.optional(v.number()),
      category: v.optional(v.string()),
      sourceUrl: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db.query('templateRecipes').collect()
  },
})

export const listIngredients = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('ingredients'),
      normalizedName: v.string(),
      aliases: v.optional(v.array(v.string())),
    }),
  ),
  handler: async (ctx) => {
    const ingredients = await ctx.db.query('ingredients').collect()
    return ingredients.map((i) => ({
      _id: i._id,
      normalizedName: i.normalizedName,
      aliases: i.aliases,
    }))
  },
})

export const insertUserRecipe = internalMutation({
  args: {
    userId: v.string(),
    title: v.string(),
    cooklangSource: v.string(),
    parsedIngredients: v.array(
      v.object({
        originalText: v.string(),
        quantity: v.optional(v.number()),
        unit: v.optional(v.string()),
        ingredientId: v.optional(v.id('ingredients')),
      }),
    ),
    parsedSteps: v.array(v.string()),
    servings: v.optional(v.number()),
    category: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  returns: v.id('recipes'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('recipes', {
      userId: args.userId,
      title: args.title,
      cooklangSource: args.cooklangSource,
      parsedIngredients: args.parsedIngredients,
      parsedSteps: args.parsedSteps,
      servings: args.servings,
      category: args.category,
      source: args.source,
    })
  },
})

export const copyTemplatesToUser = action({
  args: {},
  returns: v.object({
    copied: v.number(),
    skipped: v.boolean(),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return { copied: 0, skipped: true }
    }
    const userId = identity.subject

    const userRecipeCount = await ctx.runQuery(internal.seed.countUserRecipes, {
      userId,
    })
    if (userRecipeCount > 0) {
      return { copied: 0, skipped: true }
    }

    const templates = await ctx.runQuery(internal.seed.listTemplates)
    if (templates.length === 0) {
      return { copied: 0, skipped: true }
    }

    const ingredients = await ctx.runQuery(internal.seed.listIngredients)

    const findIngredientId = (text: string) => {
      const normalized = text.toLowerCase().trim()
      for (const ing of ingredients) {
        if (ing.normalizedName === normalized) {
          return ing._id
        }
        if (ing.aliases?.some((a) => a.toLowerCase() === normalized)) {
          return ing._id
        }
      }
      return undefined
    }

    let copied = 0
    for (const template of templates) {
      const linkedIngredients = template.parsedIngredients.map((ing) => ({
        originalText: ing.originalText,
        quantity: ing.quantity,
        unit: ing.unit,
        ingredientId: findIngredientId(ing.originalText),
      }))

      await ctx.runMutation(internal.seed.insertUserRecipe, {
        userId,
        title: template.title,
        cooklangSource: template.cooklangSource,
        parsedIngredients: linkedIngredients,
        parsedSteps: template.parsedSteps,
        servings: template.servings,
        category: template.category,
        source: template.sourceUrl,
      })
      copied++
    }

    return { copied, skipped: false }
  },
})
