import { action, internalMutation, internalQuery } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import seedData from './seedData.json'

const DEFAULT_INGREDIENTS: Array<{
  name: string
  category: string
  defaultUnit: string
  isStaple: boolean
  aliases: Array<string>
}> = [
  { name: 'Salt', category: 'Spices', defaultUnit: 'tsp', isStaple: true, aliases: ['kosher salt', 'sea salt', 'table salt'] },
  { name: 'Black Pepper', category: 'Spices', defaultUnit: 'tsp', isStaple: true, aliases: ['pepper', 'ground pepper', 'cracked pepper'] },
  { name: 'Olive Oil', category: 'Condiments', defaultUnit: 'tbsp', isStaple: true, aliases: ['extra virgin olive oil', 'EVOO'] },
  { name: 'Vegetable Oil', category: 'Condiments', defaultUnit: 'tbsp', isStaple: true, aliases: ['cooking oil', 'canola oil', 'neutral oil'] },
  { name: 'Butter', category: 'Dairy', defaultUnit: 'tbsp', isStaple: true, aliases: ['unsalted butter', 'salted butter'] },
  { name: 'Garlic', category: 'Produce', defaultUnit: 'cloves', isStaple: true, aliases: ['garlic cloves', 'fresh garlic', 'minced garlic'] },
  { name: 'Water', category: 'Other', defaultUnit: 'cup', isStaple: true, aliases: ['warm water', 'cold water', 'hot water'] },
  { name: 'All-Purpose Flour', category: 'Grains', defaultUnit: 'cup', isStaple: true, aliases: ['flour', 'AP flour', 'plain flour'] },
  { name: 'Granulated Sugar', category: 'Condiments', defaultUnit: 'cup', isStaple: true, aliases: ['sugar', 'white sugar'] },
  { name: 'Eggs', category: 'Dairy', defaultUnit: 'unit', isStaple: false, aliases: ['egg', 'large eggs', 'large egg'] },
  { name: 'Onion', category: 'Produce', defaultUnit: 'unit', isStaple: false, aliases: ['yellow onion', 'white onion', 'onions'] },
  { name: 'Milk', category: 'Dairy', defaultUnit: 'cup', isStaple: false, aliases: ['whole milk', 'skim milk', '2% milk'] },
  { name: 'Baking Powder', category: 'Condiments', defaultUnit: 'tsp', isStaple: true, aliases: [] },
  { name: 'Baking Soda', category: 'Condiments', defaultUnit: 'tsp', isStaple: true, aliases: ['bicarbonate of soda'] },
  { name: 'Vanilla Extract', category: 'Condiments', defaultUnit: 'tsp', isStaple: true, aliases: ['vanilla', 'pure vanilla extract'] },
  { name: 'Cinnamon', category: 'Spices', defaultUnit: 'tsp', isStaple: true, aliases: ['ground cinnamon'] },
  { name: 'Cumin', category: 'Spices', defaultUnit: 'tsp', isStaple: true, aliases: ['ground cumin'] },
  { name: 'Paprika', category: 'Spices', defaultUnit: 'tsp', isStaple: true, aliases: ['smoked paprika', 'sweet paprika'] },
  { name: 'Garlic Powder', category: 'Spices', defaultUnit: 'tsp', isStaple: true, aliases: [] },
  { name: 'Onion Powder', category: 'Spices', defaultUnit: 'tsp', isStaple: true, aliases: [] },
  { name: 'Oregano', category: 'Spices', defaultUnit: 'tsp', isStaple: true, aliases: ['dried oregano'] },
  { name: 'Parsley', category: 'Produce', defaultUnit: 'tbsp', isStaple: false, aliases: ['fresh parsley', 'flat-leaf parsley', 'Italian parsley'] },
  { name: 'Cilantro', category: 'Produce', defaultUnit: 'tbsp', isStaple: false, aliases: ['fresh cilantro', 'coriander leaves'] },
  { name: 'Lemon Juice', category: 'Produce', defaultUnit: 'tbsp', isStaple: false, aliases: ['fresh lemon juice'] },
  { name: 'Lemon Zest', category: 'Produce', defaultUnit: 'tsp', isStaple: false, aliases: [] },
  { name: 'Lime Juice', category: 'Produce', defaultUnit: 'tbsp', isStaple: false, aliases: ['fresh lime juice'] },
  { name: 'Soy Sauce', category: 'Condiments', defaultUnit: 'tbsp', isStaple: true, aliases: ['low-sodium soy sauce'] },
  { name: 'Honey', category: 'Condiments', defaultUnit: 'tbsp', isStaple: true, aliases: [] },
  { name: 'Maple Syrup', category: 'Condiments', defaultUnit: 'tbsp', isStaple: false, aliases: ['pure maple syrup'] },
  { name: 'Brown Sugar', category: 'Condiments', defaultUnit: 'cup', isStaple: true, aliases: ['light brown sugar', 'dark brown sugar', 'packed brown sugar'] },
  { name: 'Heavy Cream', category: 'Dairy', defaultUnit: 'cup', isStaple: false, aliases: ['heavy whipping cream', 'whipping cream'] },
  { name: 'Sour Cream', category: 'Dairy', defaultUnit: 'cup', isStaple: false, aliases: [] },
  { name: 'Cream Cheese', category: 'Dairy', defaultUnit: 'oz', isStaple: false, aliases: [] },
  { name: 'Parmesan Cheese', category: 'Dairy', defaultUnit: 'cup', isStaple: false, aliases: ['parmesan', 'parmigiano-reggiano', 'grated parmesan'] },
  { name: 'Cheddar Cheese', category: 'Dairy', defaultUnit: 'cup', isStaple: false, aliases: ['cheddar', 'shredded cheddar'] },
  { name: 'Mozzarella Cheese', category: 'Dairy', defaultUnit: 'cup', isStaple: false, aliases: ['mozzarella', 'shredded mozzarella'] },
  { name: 'Chicken Broth', category: 'Canned', defaultUnit: 'cup', isStaple: false, aliases: ['chicken stock'] },
  { name: 'Vegetable Broth', category: 'Canned', defaultUnit: 'cup', isStaple: false, aliases: ['vegetable stock'] },
  { name: 'Beef Broth', category: 'Canned', defaultUnit: 'cup', isStaple: false, aliases: ['beef stock'] },
  { name: 'Tomato Paste', category: 'Canned', defaultUnit: 'tbsp', isStaple: true, aliases: [] },
  { name: 'Diced Tomatoes', category: 'Canned', defaultUnit: 'can', isStaple: false, aliases: ['canned diced tomatoes', 'crushed tomatoes'] },
  { name: 'Tomato Sauce', category: 'Canned', defaultUnit: 'cup', isStaple: false, aliases: [] },
  { name: 'Coconut Milk', category: 'Canned', defaultUnit: 'can', isStaple: false, aliases: ['full-fat coconut milk'] },
  { name: 'Black Beans', category: 'Canned', defaultUnit: 'can', isStaple: false, aliases: ['canned black beans'] },
  { name: 'Chickpeas', category: 'Canned', defaultUnit: 'can', isStaple: false, aliases: ['garbanzo beans', 'canned chickpeas'] },
  { name: 'Rice', category: 'Grains', defaultUnit: 'cup', isStaple: true, aliases: ['white rice', 'long-grain rice', 'jasmine rice', 'basmati rice'] },
  { name: 'Pasta', category: 'Grains', defaultUnit: 'oz', isStaple: false, aliases: ['spaghetti', 'penne', 'fettuccine', 'linguine'] },
  { name: 'Bread Crumbs', category: 'Grains', defaultUnit: 'cup', isStaple: false, aliases: ['panko', 'panko bread crumbs'] },
  { name: 'Rolled Oats', category: 'Grains', defaultUnit: 'cup', isStaple: false, aliases: ['oats', 'old-fashioned oats'] },
  { name: 'Instant Yeast', category: 'Condiments', defaultUnit: 'tsp', isStaple: false, aliases: ['active dry yeast', 'yeast'] },
  { name: 'Cornstarch', category: 'Condiments', defaultUnit: 'tbsp', isStaple: true, aliases: ['corn starch'] },
  { name: 'Apple Cider Vinegar', category: 'Condiments', defaultUnit: 'tbsp', isStaple: true, aliases: [] },
  { name: 'Red Wine Vinegar', category: 'Condiments', defaultUnit: 'tbsp', isStaple: false, aliases: [] },
  { name: 'Sesame Oil', category: 'Condiments', defaultUnit: 'tsp', isStaple: false, aliases: ['toasted sesame oil'] },
  { name: 'Dijon Mustard', category: 'Condiments', defaultUnit: 'tbsp', isStaple: false, aliases: ['dijon'] },
  { name: 'Mayonnaise', category: 'Condiments', defaultUnit: 'tbsp', isStaple: false, aliases: ['mayo'] },
  { name: 'Worcestershire Sauce', category: 'Condiments', defaultUnit: 'tbsp', isStaple: false, aliases: [] },
  { name: 'Hot Sauce', category: 'Condiments', defaultUnit: 'tsp', isStaple: false, aliases: ['sriracha', 'tabasco'] },
  { name: 'Chicken Breast', category: 'Meat', defaultUnit: 'lb', isStaple: false, aliases: ['boneless skinless chicken breast', 'chicken breasts'] },
  { name: 'Ground Beef', category: 'Meat', defaultUnit: 'lb', isStaple: false, aliases: ['lean ground beef', 'minced beef'] },
  { name: 'Bacon', category: 'Meat', defaultUnit: 'slices', isStaple: false, aliases: ['bacon strips'] },
  { name: 'Carrots', category: 'Produce', defaultUnit: 'unit', isStaple: false, aliases: ['carrot'] },
  { name: 'Celery', category: 'Produce', defaultUnit: 'stalks', isStaple: false, aliases: ['celery stalks'] },
  { name: 'Bell Pepper', category: 'Produce', defaultUnit: 'unit', isStaple: false, aliases: ['red bell pepper', 'green bell pepper', 'bell peppers'] },
  { name: 'Tomatoes', category: 'Produce', defaultUnit: 'unit', isStaple: false, aliases: ['tomato', 'fresh tomatoes', 'roma tomatoes'] },
  { name: 'Spinach', category: 'Produce', defaultUnit: 'cup', isStaple: false, aliases: ['fresh spinach', 'baby spinach'] },
  { name: 'Broccoli', category: 'Produce', defaultUnit: 'cup', isStaple: false, aliases: ['broccoli florets'] },
  { name: 'Potatoes', category: 'Produce', defaultUnit: 'lb', isStaple: false, aliases: ['potato', 'russet potatoes', 'yukon gold potatoes'] },
  { name: 'Sweet Potatoes', category: 'Produce', defaultUnit: 'unit', isStaple: false, aliases: ['sweet potato', 'yams'] },
  { name: 'Avocado', category: 'Produce', defaultUnit: 'unit', isStaple: false, aliases: ['avocados', 'ripe avocado'] },
  { name: 'Ginger', category: 'Produce', defaultUnit: 'tbsp', isStaple: false, aliases: ['fresh ginger', 'ginger root', 'minced ginger'] },
  { name: 'Green Onions', category: 'Produce', defaultUnit: 'unit', isStaple: false, aliases: ['scallions', 'spring onions'] },
  { name: 'Jalapeño', category: 'Produce', defaultUnit: 'unit', isStaple: false, aliases: ['jalapeno', 'jalapeño pepper'] },
  { name: 'Mushrooms', category: 'Produce', defaultUnit: 'cup', isStaple: false, aliases: ['button mushrooms', 'cremini mushrooms', 'sliced mushrooms'] },
  { name: 'Zucchini', category: 'Produce', defaultUnit: 'unit', isStaple: false, aliases: ['courgette'] },
  { name: 'Banana', category: 'Produce', defaultUnit: 'unit', isStaple: false, aliases: ['bananas', 'ripe banana'] },
  { name: 'Lemon', category: 'Produce', defaultUnit: 'unit', isStaple: false, aliases: ['lemons'] },
  { name: 'Lime', category: 'Produce', defaultUnit: 'unit', isStaple: false, aliases: ['limes'] },
  { name: 'Orange', category: 'Produce', defaultUnit: 'unit', isStaple: false, aliases: ['oranges'] },
  { name: 'Walnuts', category: 'Other', defaultUnit: 'cup', isStaple: false, aliases: ['chopped walnuts'] },
  { name: 'Almonds', category: 'Other', defaultUnit: 'cup', isStaple: false, aliases: ['sliced almonds', 'slivered almonds'] },
  { name: 'Chocolate Chips', category: 'Other', defaultUnit: 'cup', isStaple: false, aliases: ['semi-sweet chocolate chips', 'dark chocolate chips'] },
  { name: 'Cocoa Powder', category: 'Other', defaultUnit: 'tbsp', isStaple: false, aliases: ['unsweetened cocoa powder', 'dutch-process cocoa'] },
  { name: 'Peanut Butter', category: 'Condiments', defaultUnit: 'tbsp', isStaple: false, aliases: ['creamy peanut butter'] },
  { name: 'Flaxseed Meal', category: 'Other', defaultUnit: 'tbsp', isStaple: false, aliases: ['ground flaxseed', 'flax meal'] },
  { name: 'Chia Seeds', category: 'Other', defaultUnit: 'tbsp', isStaple: false, aliases: [] },
]

const GITHUB_IMAGE_BASE = 'https://raw.githubusercontent.com/nicholaswilde/recipes/main/docs/assets/images/'

const slugify = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const generateImageUrl = (title: string): string => {
  return `${GITHUB_IMAGE_BASE}${slugify(title)}.jpg`
}

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

    for (const ing of DEFAULT_INGREDIENTS) {
      await ctx.runMutation(internal.seed.insertIngredient, {
        name: ing.name,
        category: ing.category,
        defaultUnit: ing.defaultUnit,
        isStaple: ing.isStaple,
        aliases: ing.aliases,
      })
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
        image: generateImageUrl(recipe.title),
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

export const insertIngredient = internalMutation({
  args: {
    name: v.string(),
    category: v.string(),
    defaultUnit: v.string(),
    isStaple: v.boolean(),
    aliases: v.array(v.string()),
  },
  returns: v.union(v.id('ingredients'), v.null()),
  handler: async (ctx, args) => {
    const normalizedName = args.name.toLowerCase().trim()
    const existing = await ctx.db
      .query('ingredients')
      .withIndex('by_normalizedName', (q) => q.eq('normalizedName', normalizedName))
      .first()
    if (existing) return null
    return await ctx.db.insert('ingredients', {
      name: args.name,
      normalizedName,
      category: args.category,
      defaultUnit: args.defaultUnit,
      isStaple: args.isStaple,
      aliases: args.aliases,
    })
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
      image: args.image,
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
      _creationTime: v.number(),
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
      image: v.optional(v.string()),
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
    image: v.optional(v.string()),
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
      image: args.image,
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

    const normalizeForMatching = (text: string): Array<string> => {
      const base = text
        .toLowerCase()
        .trim()
        .replace(/\s*\(optional\)\s*/gi, '')
        .replace(/\s*\(.*?\)\s*/g, ' ')
        .replace(/,.*$/, '')
        .trim()

      const variants = [base]

      if (base.includes(' or ')) {
        variants.push(...base.split(' or ').map((s) => s.trim()))
      }

      const words = base.split(/\s+/)
      if (words.length > 1) {
        variants.push(words[words.length - 1])
      }

      return variants.filter((v) => v.length > 0)
    }

    const findIngredientId = (text: string) => {
      const variants = normalizeForMatching(text)

      for (const variant of variants) {
        for (const ing of ingredients) {
          if (ing.normalizedName === variant) {
            return ing._id
          }
          if (ing.aliases?.some((a) => a.toLowerCase() === variant)) {
            return ing._id
          }
        }
      }

      for (const variant of variants) {
        for (const ing of ingredients) {
          if (ing.normalizedName.includes(variant) || variant.includes(ing.normalizedName)) {
            return ing._id
          }
        }
      }

      return undefined
    }

    let copied = 0
    for (const template of templates) {
      const linkedIngredients: Array<{
        originalText: string
        quantity?: number
        unit?: string
        ingredientId?: Id<'ingredients'>
      }> = []

      for (const ing of template.parsedIngredients) {
        const ingredientId = findIngredientId(ing.originalText)

        linkedIngredients.push({
          originalText: ing.originalText,
          quantity: ing.quantity,
          unit: ing.unit,
          ingredientId,
        })
      }

      await ctx.runMutation(internal.seed.insertUserRecipe, {
        userId,
        title: template.title,
        cooklangSource: template.cooklangSource,
        parsedIngredients: linkedIngredients,
        parsedSteps: template.parsedSteps,
        servings: template.servings,
        category: template.category,
        source: template.sourceUrl,
        image: template.image || generateImageUrl(template.title),
      })
      copied++
    }

    return { copied, skipped: false }
  },
})

