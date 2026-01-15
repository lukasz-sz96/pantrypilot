import { createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { routeTree } from './routeTree.gen'

const getServerEnv = (key: string): string | undefined => {
  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).process !== 'undefined') {
    return (globalThis as any).process.env?.[key]
  }
  return undefined
}

const CONVEX_URL =
  getServerEnv('CONVEX_URL') ||
  (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_CONVEX_URL : '') ||
  ''

const CLERK_PUBLISHABLE_KEY =
  getServerEnv('CLERK_PUBLISHABLE_KEY') ||
  (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY : '') ||
  ''

export function getRouter() {
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
