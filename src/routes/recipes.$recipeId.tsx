import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useState } from 'react'

const RecipeDetail = () => {
  const { recipeId } = Route.useParams()
  const recipe = useQuery(api.recipes.get, {
    id: recipeId as Id<'recipes'>,
  })
  const pantryItems = useQuery(api.pantry.list)
  const allIngredients = useQuery(api.ingredients.list)
  const [currentStep, setCurrentStep] = useState(0)
  const [showCookMode, setShowCookMode] = useState(false)

  if (recipe === undefined) {
    return (
      <>
        <header className="page-header">
          <h1 className="page-title">Loading...</h1>
        </header>
        <div className="px-4 py-8 text-center">
          <div className="animate-pulse text-warmgray">Loading recipe...</div>
        </div>
      </>
    )
  }

  if (recipe === null) {
    return (
      <>
        <header className="page-header">
          <h1 className="page-title">Recipe Not Found</h1>
        </header>
        <div className="px-4 py-8 text-center">
          <p className="text-warmgray mb-4">This recipe doesn't exist.</p>
          <Link to="/recipes" className="btn-primary">
            Back to Recipes
          </Link>
        </div>
      </>
    )
  }

  // Check ingredient availability
  const getIngredientStatus = (ingredientId?: Id<'ingredients'>) => {
    if (!ingredientId || !pantryItems) return 'unknown'
    const pantryItem = pantryItems.find((p) => p.ingredientId === ingredientId)
    if (!pantryItem) return 'missing'
    if (pantryItem.quantity <= 0) return 'empty'
    return 'available'
  }

  const getIngredientName = (ingredientId?: Id<'ingredients'>) => {
    if (!ingredientId || !allIngredients) return null
    return allIngredients.find((i) => i._id === ingredientId)?.name
  }

  const ingredientsWithStatus = recipe.parsedIngredients.map((ing) => ({
    ...ing,
    status: getIngredientStatus(ing.ingredientId as Id<'ingredients'> | undefined),
    linkedName: getIngredientName(ing.ingredientId as Id<'ingredients'> | undefined),
  }))

  const availableCount = ingredientsWithStatus.filter(
    (i) => i.status === 'available'
  ).length
  const totalLinked = ingredientsWithStatus.filter((i) => i.ingredientId).length

  if (showCookMode) {
    return (
      <CookModeView
        recipe={recipe}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        onExit={() => setShowCookMode(false)}
      />
    )
  }

  return (
    <>
      <header className="page-header">
        <div className="flex items-center gap-3">
          <Link
            to="/recipes"
            className="w-10 h-10 rounded-full bg-cream flex items-center justify-center hover:bg-sage/20 transition-colors"
          >
            ←
          </Link>
          <h1 className="page-title flex-1">{recipe.title}</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-6">
        {/* Source link */}
        {recipe.source && (
          <a
            href={recipe.source}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-sage hover:underline flex items-center gap-1"
          >
            View original recipe →
          </a>
        )}

        {/* Ingredient availability summary */}
        {totalLinked > 0 && (
          <div className="bg-cream rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-espresso">Ingredient Check</span>
              <span
                className={`text-sm font-medium ${
                  availableCount === totalLinked
                    ? 'text-sage'
                    : availableCount >= totalLinked * 0.7
                      ? 'text-yellow-600'
                      : 'text-terracotta'
                }`}
              >
                {availableCount}/{totalLinked} in pantry
              </span>
            </div>
            <div className="w-full bg-warmgray/20 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  availableCount === totalLinked
                    ? 'bg-sage'
                    : availableCount >= totalLinked * 0.7
                      ? 'bg-yellow-500'
                      : 'bg-terracotta'
                }`}
                style={{ width: `${(availableCount / totalLinked) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Ingredients */}
        <section>
          <h2 className="text-lg font-display text-espresso mb-3">Ingredients</h2>
          <div className="space-y-2">
            {ingredientsWithStatus.map((ing, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 bg-cream rounded-xl"
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                    ing.status === 'available'
                      ? 'bg-sage/20 text-sage'
                      : ing.status === 'missing' || ing.status === 'empty'
                        ? 'bg-terracotta/20 text-terracotta'
                        : 'bg-warmgray/20 text-warmgray'
                  }`}
                >
                  {ing.status === 'available' ? '✓' : ing.status === 'unknown' ? '?' : '✕'}
                </div>
                <div className="flex-1">
                  <span className="text-espresso">
                    {ing.quantity && `${ing.quantity} `}
                    {ing.unit && `${ing.unit} `}
                    {ing.linkedName || ing.originalText}
                  </span>
                  {ing.linkedName && ing.linkedName !== ing.originalText && (
                    <span className="text-xs text-warmgray ml-2">
                      ({ing.originalText})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Steps */}
        <section>
          <h2 className="text-lg font-display text-espresso mb-3">Instructions</h2>
          <div className="space-y-3">
            {recipe.parsedSteps.map((step, idx) => (
              <div key={idx} className="flex gap-3 p-3 bg-cream rounded-xl">
                <div className="w-8 h-8 rounded-full bg-sage/20 text-sage flex items-center justify-center font-medium shrink-0">
                  {idx + 1}
                </div>
                <p className="text-espresso flex-1 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Action buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => setShowCookMode(true)}
            className="flex-1 btn-primary"
          >
            Start Cooking
          </button>
          <Link
            to="/recipes"
            className="px-6 py-3 rounded-xl border border-warmgray/30 text-espresso hover:bg-warmgray/10 transition-colors"
          >
            Back
          </Link>
        </div>
      </div>
    </>
  )
}

// Cook mode - step-by-step view
const CookModeView = ({
  recipe,
  currentStep,
  setCurrentStep,
  onExit,
}: {
  recipe: {
    title: string
    parsedSteps: string[]
    parsedIngredients: { originalText: string; quantity?: number; unit?: string }[]
  }
  currentStep: number
  setCurrentStep: (step: number) => void
  onExit: () => void
}) => {
  const totalSteps = recipe.parsedSteps.length
  const isLastStep = currentStep === totalSteps - 1

  return (
    <div className="min-h-screen bg-espresso text-cream flex flex-col">
      <header className="px-4 py-4 flex items-center justify-between border-b border-cream/10">
        <button
          onClick={onExit}
          className="text-cream/70 hover:text-cream transition-colors"
        >
          ← Exit
        </button>
        <span className="text-cream/70">
          Step {currentStep + 1} of {totalSteps}
        </span>
        <div className="w-12" />
      </header>

      <div className="flex-1 flex flex-col justify-center px-6 py-8">
        <div className="text-center">
          <div className="text-6xl font-display text-sage mb-6">
            {currentStep + 1}
          </div>
          <p className="text-xl leading-relaxed">{recipe.parsedSteps[currentStep]}</p>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* Progress bar */}
        <div className="flex gap-1">
          {recipe.parsedSteps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                idx === currentStep
                  ? 'bg-sage'
                  : idx < currentStep
                    ? 'bg-cream/50'
                    : 'bg-cream/20'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="flex-1 py-4 rounded-xl border border-cream/30 text-cream disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cream/10 transition-colors"
          >
            Previous
          </button>
          {isLastStep ? (
            <button
              onClick={onExit}
              className="flex-1 py-4 rounded-xl bg-sage text-espresso font-medium hover:bg-sage/90 transition-colors"
            >
              Done!
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep(Math.min(totalSteps - 1, currentStep + 1))}
              className="flex-1 py-4 rounded-xl bg-sage text-espresso font-medium hover:bg-sage/90 transition-colors"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/recipes/$recipeId')({
  component: RecipeDetail,
})
