import { createFileRoute } from '@tanstack/react-router'

const Pantry = () => (
  <>
    <header className="page-header">
      <h1 className="page-title">Pantry</h1>
    </header>
    <div className="px-4 py-4">
      <p className="text-warmgray">pantry</p>
    </div>
  </>
)

export const Route = createFileRoute('/pantry')({
  component: Pantry,
})
