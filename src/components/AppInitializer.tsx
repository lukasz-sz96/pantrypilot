import { useEffect, useRef } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

export const AppInitializer = () => {
  const seedStaples = useMutation(api.seed.seedStaples)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    seedStaples()
      .then((count) => {
        if (count > 0) {
          console.log(`Seeded ${count} staple ingredients`)
        }
      })
      .catch(console.error)
  }, [seedStaples])

  return null
}
