import { createFileRoute } from '@tanstack/react-router'

const Shopping = () => (
  <>
    <header className="page-header">
      <h1 className="page-title">Shopping Lists</h1>
    </header>
    <div className="px-4 py-4">
      <p className="text-warmgray">shopping list</p>
    </div>
  </>
)

export const Route = createFileRoute('/shopping')({
  component: Shopping,
})
