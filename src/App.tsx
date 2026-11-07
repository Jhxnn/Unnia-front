import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { ToastProvider } from './components/ToastProvider'
import { RequireAuth } from './features/auth/RequireAuth'
import { ApiError } from './lib/api/errors'
import { AdminPage } from './pages/AdminPage'
import { EditProfilePage } from './pages/EditProfilePage'
import { FeedPage } from './pages/FeedPage'
import { CheckEmailPage } from './pages/CheckEmailPage'
import { EditEventPage } from './pages/EditEventPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { EventsPage } from './pages/EventsPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { MessagesPage } from './pages/MessagesPage'
import { MyRegistrationsPage } from './pages/MyRegistrationsPage'
import { NewEventPage } from './pages/NewEventPage'
import { NgoEventsPage } from './pages/NgoEventsPage'
import { NgoProfilePage } from './pages/NgoProfilePage'
import { NgosPage } from './pages/NgosPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PostPage } from './pages/PostPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { RegisterChoicePage } from './pages/RegisterChoicePage'
import { RegisterNgoPage } from './pages/RegisterNgoPage'
import { RegisterVolunteerPage } from './pages/RegisterVolunteerPage'
import { VolunteerProfilePage } from './pages/VolunteerProfilePage'

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
      { path: 'ongs', element: <NgosPage /> },
      { path: 'ongs/:ngoId', element: <NgoProfilePage /> },
      { path: 'voluntarios/:volunteerId', element: <VolunteerProfilePage /> },
      { path: 'entrar', element: <LoginPage /> },
      { path: 'confirme-seu-email', element: <CheckEmailPage /> },
      { path: 'verificar-email', element: <VerifyEmailPage /> },
      { path: 'cadastro', element: <RegisterChoicePage /> },
      { path: 'cadastro/voluntario', element: <RegisterVolunteerPage /> },
      { path: 'cadastro/ong', element: <RegisterNgoPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: 'inicio', element: <FeedPage /> },
          { path: 'posts/:postId', element: <PostPage /> },
          { path: 'mensagens', element: <MessagesPage /> },
          { path: 'mensagens/:conversationId', element: <MessagesPage /> },
          { path: 'notificacoes', element: <NotificationsPage /> },
          { path: 'perfil', element: <EditProfilePage /> },
        ],
      },
      {
        element: <RequireAuth role="VOLUNTEER" />,
        children: [{ path: 'inscricoes', element: <MyRegistrationsPage /> }],
      },
      {
        element: <RequireAuth role="NGO" />,
        children: [
          { path: 'ong/eventos', element: <NgoEventsPage /> },
          { path: 'ong/eventos/novo', element: <NewEventPage /> },
          { path: 'ong/eventos/:eventId/editar', element: <EditEventPage /> },
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
