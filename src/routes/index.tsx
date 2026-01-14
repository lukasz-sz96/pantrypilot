import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

type RecipeWithAvailability = {
  _id: Id<'recipes'>
  title: string
  source?: string
  parsedIngredients: {
    originalText: string
    quantity?: number
    unit?: string
    ingredientId?: Id<'ingredients'>
  }[]
  availableCount: number
  totalLinked: number
  percentage: number
  status: 'ready' | 'almost' | 'far'
}

const Home = () => {
  const recipes = useQuery(api.recipes.list)
  const pantryItems = useQuery(api.pantry.list)
  const ingredients = useQuery(api.ingredients.list)

  if (recipes === undefined || pantryItems === undefined) {
    return (
      <>
        <header className="page-header">
          <h1 className="page-title">What can I make?</h1>
        </header>
        <div className="px-4 py-8 text-center">
          <div className="animate-pulse text-warmgray">Loading...</div>
        </div>
      </>
    )
  }

  const pantryIngredientIds = new Set(
    pantryItems.filter((p) => p.quantity > 0).map((p) => p.ingredientId)
  )

  const stapleIds = new Set(
    (ingredients || []).filter((i) => i.isStaple).map((i) => i._id)
  )

  const recipesWithAvailability: RecipeWithAvailability[] = recipes.map((recipe) => {
    const linkedIngredients = recipe.parsedIngredients.filter(
      (ing) => ing.ingredientId
    )

    const nonStapleIngredients = linkedIngredients.filter(
      (ing) => !stapleIds.has(ing.ingredientId as Id<'ingredients'>)
    )

    const availableCount = nonStapleIngredients.filter((ing) =>
      pantryIngredientIds.has(ing.ingredientId as Id<'ingredients'>)
    ).length

    const totalLinked = nonStapleIngredients.length
    const percentage = totalLinked > 0 ? (availableCount / totalLinked) * 100 : 100

    let status: 'ready' | 'almost' | 'far' = 'far'
    if (percentage === 100) status = 'ready'
    else if (percentage >= 70) status = 'almost'

    return {
      ...recipe,
      availableCount,
      totalLinked,
      percentage,
      status,
    }
  })

  const readyRecipes = recipesWithAvailability
    .filter((r) => r.status === 'ready')
    .sort((a, b) => b.percentage - a.percentage)

  const almostRecipes = recipesWithAvailability
    .filter((r) => r.status === 'almost')
    .sort((a, b) => b.percentage - a.percentage)

  const farRecipes = recipesWithAvailability
    .filter((r) => r.status === 'far')
    .sort((a, b) => b.percentage - a.percentage)

  if (recipes.length === 0) {
    return (
      <>
        <header className="page-header">
          <h1 className="page-title">What can I make?</h1>
        </header>
        <div className="px-4 py-8 text-center">
          <p className="text-warmgray mb-4">No recipes yet.</p>
          <Link to="/recipes" className="btn-primary">
            Add your first recipe
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">What can I make?</h1>
      </header>

      <div className="px-4 py-4 space-y-6">
        {readyRecipes.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-sage uppercase tracking-wide mb-3">
              Ready to Cook ({readyRecipes.length})
            </h2>
            <div className="space-y-3">
              {readyRecipes.map((recipe) => (
                <RecipeCard key={recipe._id} recipe={recipe} />
              ))}
            </div>
          </section>
        )}

        {almostRecipes.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-yellow-600 uppercase tracking-wide mb-3">
              Almost Ready ({almostRecipes.length})
            </h2>
            <div className="space-y-3">
              {almostRecipes.map((recipe) => (
                <RecipeCard key={recipe._id} recipe={recipe} />
              ))}
            </div>
          </section>
        )}

        {farRecipes.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-warmgray uppercase tracking-wide mb-3">
              Need More Ingredients ({farRecipes.length})
            </h2>
            <div className="space-y-3">
              {farRecipes.map((recipe) => (
                <RecipeCard key={recipe._id} recipe={recipe} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}

const RecipeCard = ({ recipe }: { recipe: RecipeWithAvailability }) => (
  <Link
    to="/recipes/$recipeId"
    params={{ recipeId: recipe._id }}
    className="card block hover:shadow-md transition-shadow"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <h3 className="font-display text-lg text-espresso">{recipe.title}</h3>
        <div className="flex items-center gap-2 mt-1 text-sm text-warmgray">
          <span>{recipe.parsedIngredients.length} ingredients</span>
          {recipe.source && (
            <>
              <span>•</span>
              <span className="truncate max-w-[120px]">
                {new URL(recipe.source).hostname.replace('www.', '')}
              </span>
            </>
          )}
        </div>
      </div>
      <div
        className={`px-3 py-1 rounded-full text-sm font-medium ${
          recipe.status === 'ready'
            ? 'bg-sage/20 text-sage'
            : recipe.status === 'almost'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-warmgray/20 text-warmgray'
        }`}
      >
        {recipe.status === 'ready'
          ? '✓ Ready'
          : `${recipe.availableCount}/${recipe.totalLinked}`}
      </div>
    </div>
    {recipe.status !== 'ready' && recipe.totalLinked > 0 && (
      <div className="mt-3">
        <div className="w-full bg-warmgray/20 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full ${
              recipe.status === 'almost' ? 'bg-yellow-500' : 'bg-warmgray/40'
            }`}
            style={{ width: `${recipe.percentage}%` }}
          />
        </div>
      </div>
    )}
  </Link>
)

export const Route = createFileRoute('/')({
  component: Home,
})
