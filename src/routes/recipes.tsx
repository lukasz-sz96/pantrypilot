import { createFileRoute } from '@tanstack/react-router'

const Recipes = () => (
  <>
    <header className="page-header">
      <h1 className="page-title">Recipes</h1>
    </header>
    <div className="px-4 py-4">
      <p className="text-warmgray">recipes</p>
    </div>
  </>
)

export const Route = createFileRoute('/recipes')({
  component: Recipes,
})
