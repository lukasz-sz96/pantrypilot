import { mutation } from "./_generated/server"
import { v } from "convex/values"

const DEFAULT_STAPLES = [
  { name: "Salt", category: "Spices", defaultUnit: "tsp", aliases: ["sel", "sal", "kosher salt", "sea salt", "table salt"] },
  { name: "Black Pepper", category: "Spices", defaultUnit: "tsp", aliases: ["pepper", "poivre", "pimienta", "ground pepper", "cracked pepper"] },
  { name: "Olive Oil", category: "Condiments", defaultUnit: "tbsp", aliases: ["huile d'olive", "aceite de oliva", "EVOO", "extra virgin olive oil"] },
  { name: "Vegetable Oil", category: "Condiments", defaultUnit: "tbsp", aliases: ["cooking oil", "canola oil", "neutral oil"] },
  { name: "Butter", category: "Dairy", defaultUnit: "tbsp", aliases: ["beurre", "mantequilla", "unsalted butter", "salted butter"] },
  { name: "Water", category: "Other", defaultUnit: "cup", aliases: ["eau", "agua", "warm water", "cold water", "hot water"] },
  { name: "Garlic", category: "Produce", defaultUnit: "cloves", aliases: ["ail", "ajo", "garlic cloves", "fresh garlic", "minced garlic"] },
]

export const seedStaples = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const existing = await ctx.db.query("ingredients").collect()
    if (existing.length > 0) {
      return 0
    }

    for (const staple of DEFAULT_STAPLES) {
      await ctx.db.insert("ingredients", {
        name: staple.name,
        normalizedName: staple.name.toLowerCase().trim(),
        aliases: staple.aliases,
        category: staple.category,
        isStaple: true,
        defaultUnit: staple.defaultUnit,
      })
    }

    return DEFAULT_STAPLES.length
  },
})
