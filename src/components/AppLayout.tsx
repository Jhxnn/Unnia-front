import { useQueryClient } from '@tanstack/react-query'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { usePendingAdminWork } from '../features/admin/queries'
import { useMe } from '../features/auth/useMe'
import { useSession } from '../features/auth/useSession'
import { useUnreadMessages } from '../features/messaging/queries'
import { useUnreadNotifications } from '../features/notifications/queries'
import { signOut } from '../lib/api/client'
import { Button, ButtonLink } from './Button'
import { Logo } from './Logo'
import './layout.css'

function navClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'nav__link nav__link--active' : 'nav__link'
}

function Badge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null
  return (
    <span className="badge" role="status" aria-label={`${count} ${label}`}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

function Header() {
  const { status, session } = useSession()
  const { me } = useMe()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const signedIn = status === 'authenticated'
  const unreadMessages = useUnreadMessages(signedIn)
  const unreadNotifications = useUnreadNotifications(signedIn)
  const pendingAdminWork = usePendingAdminWork(session?.role === 'ADMIN')

  async function handleSignOut() {
    await signOut()
    queryClient.clear()
    navigate('/')
  }

  return (
    <header className="header">
      <div className="page header__inner">
        <Link to="/" className="header__brand" aria-label="Unnia, página inicial">
          <Logo />
        </Link>

        <nav className="nav" aria-label="Principal">
          {signedIn ? (
            <NavLink to="/inicio" className={navClass}>
              Início
            </NavLink>
          ) : null}
          <NavLink to="/eventos" className={navClass}>
            Eventos
          </NavLink>
          <NavLink to="/ongs" className={navClass}>
            ONGs
          </NavLink>
          {session?.role === 'VOLUNTEER' ? (
            <NavLink to="/inscricoes" className={navClass}>
              Minhas inscrições
            </NavLink>
          ) : null}
          {session?.role === 'ADMIN' ? (
            <NavLink to="/admin" className={navClass}>
              Painel da equipe
              <Badge count={pendingAdminWork} label="pendências" />
            </NavLink>
          ) : null}
          {session?.role === 'NGO' ? (
            <NavLink to="/ong/eventos" className={navClass}>
              Meus eventos
            </NavLink>
          ) : null}
          {signedIn ? (
            <>
              <NavLink to="/mensagens" className={navClass}>
                Mensagens
                <Badge count={unreadMessages} label="mensagens não lidas" />
              </NavLink>
              <NavLink to="/perfil" className={(state) => navClass(state) + " nav__link--compact-only"}>
                Meu perfil
              </NavLink>
            </>
          ) : null}
        </nav>

        <div className="header__actions">
          {signedIn ? (
            <>
              <NavLink
                to="/notificacoes"
                aria-label="Notificações"
                className={({ isActive }) => (isActive ? 'bell bell--active' : 'bell')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" />
                  <path d="M10 20a2 2 0 0 0 4 0" />
                </svg>
                <Badge count={unreadNotifications} label="notificações não lidas" />
              </NavLink>
              {me?.name ? (
                <NavLink to="/perfil" className="header__user">
                  {me.name}
                </NavLink>
              ) : (
                <NavLink to="/perfil" className={navClass}>
                  Meu perfil
                </NavLink>
              )}
              <Button variant="quiet" onClick={handleSignOut}>
                Sair
              </Button>
            </>
          ) : status === 'anonymous' ? (
            <>
              <ButtonLink variant="quiet" to="/entrar">
                Entrar
              </ButtonLink>
              <ButtonLink to="/cadastro">Criar conta</ButtonLink>
            </>
          ) : null}
        </div>
      </div>
    </header>
  )
}

export function AppLayout() {
  return (
    <>
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>
      <Header />
      <main id="conteudo" className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="page footer__inner">
          <Logo />
          <p className="footer__text">Conecta ONGs e voluntários em eventos solidários.</p>
        </div>
      </footer>
    </>
  )
}
