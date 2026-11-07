import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { ToastProvider } from './components/ToastProvider'
import { RequireAuth } from './features/auth/RequireAuth'
import { ApiError } from './lib/api/errors'
import { AdminPage } from './pages/AdminPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { EventsPage } from './pages/EventsPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { MyRegistrationsPage } from './pages/MyRegistrationsPage'
import { NewEventPage } from './pages/NewEventPage'
import { NgoEventsPage } from './pages/NgoEventsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RegisterChoicePage } from './pages/RegisterChoicePage'
import { RegisterNgoPage } from './pages/RegisterNgoPage'
import { RegisterVolunteerPage } from './pages/RegisterVolunteerPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // erros do cliente (4xx) não melhoram tentando de novo; falhas de rede e 5xx merecem uma segunda chance
      retry: (failureCount, error) => !(error instanceof ApiError && error.status < 500) && failureCount < 2,
    },
  },
})

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'eventos', element: <EventsPage /> },
      { path: 'eventos/:eventId', element: <EventDetailPage /> },
      { path: 'entrar', element: <LoginPage /> },
      { path: 'cadastro', element: <RegisterChoicePage /> },
      { path: 'cadastro/voluntario', element: <RegisterVolunteerPage /> },
      { path: 'cadastro/ong', element: <RegisterNgoPage /> },
      {
        element: <RequireAuth role="VOLUNTEER" />,
        children: [{ path: 'inscricoes', element: <MyRegistrationsPage /> }],
      },
      {
        element: <RequireAuth role="NGO" />,
        children: [
          { path: 'ong/eventos', element: <NgoEventsPage /> },
          { path: 'ong/eventos/novo', element: <NewEventPage /> },
        ],
      },
      {
        element: <RequireAuth role="ADMIN" />,
        children: [{ path: 'admin', element: <AdminPage /> }],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  )
}
