import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Données considérées fraîches pendant 5 minutes
      staleTime: 5 * 60 * 1000,

      // Données en cache pendant 30 minutes
      gcTime: 30 * 60 * 1000,

      // Refetch quand la fenêtre reprend le focus
      refetchOnWindowFocus: true,

      // Retry 2 fois en cas d'erreur
      retry: 2,

      // Retry delay exponentiel
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry 1 fois pour les mutations
      retry: 1,
    },
  },
});
