import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from './router/router'
import { AuthProvider } from './components/providers/AuthProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // React Strict Mode remounts components twice in dev; staleTime > 0 keeps the first
      // successful fetch "fresh" so the second mount reuses cache instead of firing again.
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  )
}