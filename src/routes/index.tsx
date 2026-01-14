import { createFileRoute } from '@tanstack/react-router'

const Home = () => (
  <>
    <header className="page-header">
      <h1 className="page-title">What can I make?</h1>
    </header>
    <div className="px-4 py-4">
      <p className="text-warmgray">Add some recipes and ingredients to get started.</p>
    </div>
  </>
)

export const Route = createFileRoute('/')({
  component: Home,
})
