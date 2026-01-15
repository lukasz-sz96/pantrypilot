import { createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { routeTree } from './routeTree.gen'

const getEnv = (viteKey: string, nodeKey: string) => {
  if (typeof process !== 'undefined' && process.env?.[nodeKey]) {
    return process.env[nodeKey]
  }
  return (import.meta as any).env?.[viteKey]
}

const CLERK_PUBLISHABLE_KEY = getEnv('VITE_CLERK_PUBLISHABLE_KEY', 'CLERK_PUBLISHABLE_KEY')

export function getRouter() {
  const CONVEX_URL = getEnv('VITE_CONVEX_URL', 'CONVEX_URL')!
  if (!CONVEX_URL) {
    console.error('missing envar CONVEX_URL')
  }
  if (!CLERK_PUBLISHABLE_KEY) {
    console.error('missing envar VITE_CLERK_PUBLISHABLE_KEY')
  }
  const convexQueryClient = new ConvexQueryClient(CONVEX_URL)

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
        gcTime: 5000,
      },
    },
  })
  convexQueryClient.connect(queryClient)

  const router = routerWithQueryClient(
    createRouter({
      routeTree,
      defaultPreload: 'intent',
      context: { queryClient },
      scrollRestoration: true,
      defaultPreloadStaleTime: 0,
      defaultErrorComponent: (err) => <p>{err.error.stack}</p>,
      defaultNotFoundComponent: () => <p>not found</p>,
      Wrap: ({ children }) => (
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
          <ConvexProviderWithClerk client={convexQueryClient.convexClient} useAuth={useAuth}>
            {children}
          </ConvexProviderWithClerk>
        </ClerkProvider>
      ),
    }),
    queryClient,
  )

  return router
}
