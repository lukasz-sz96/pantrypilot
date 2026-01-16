import { useEffect, useRef } from 'react'
import { useAction } from 'convex/react'
import { useAuth } from '@clerk/clerk-react'
import { api } from '../../convex/_generated/api'

export const AppInitializer = () => {
  const { isSignedIn } = useAuth()
  const seedTemplateRecipes = useAction(api.seed.seedTemplateRecipes)
  const copyTemplatesToUser = useAction(api.seed.copyTemplatesToUser)
  const initialized = useRef(false)
  const userInitialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    seedTemplateRecipes()
      .then((result) => {
        if (result.seeded > 0) {
          console.log(`Seeded ${result.seeded} template recipes`)
        }
      })
      .catch(console.error)
  }, [seedTemplateRecipes])

  useEffect(() => {
    if (!isSignedIn || userInitialized.current) return
    userInitialized.current = true

    copyTemplatesToUser()
      .then((result) => {
        if (result.copied > 0) {
          console.log(`Copied ${result.copied} recipes to your library`)
        }
      })
      .catch(console.error)
  }, [isSignedIn, copyTemplatesToUser])

  return null
}
