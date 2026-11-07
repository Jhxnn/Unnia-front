import { useQueryClient } from '@tanstack/react-query'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { useMe } from '../features/auth/useMe'
import { useSession } from '../features/auth/useSession'
import { signOut } from '../lib/api/client'
import { Button, ButtonLink } from './Button'
import { Logo } from './Logo'
import './layout.css'

function navClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'nav__link nav__link--active' : 'nav__link'
}

function Header() {
  const { status, session } = useSession()
  const { me } = useMe()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const signedIn = status === 'authenticated'

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
          <NavLink to="/eventos" className={navClass}>
            Eventos
          </NavLink>
          {session?.role === 'VOLUNTEER' ? (
            <NavLink to="/inscricoes" className={navClass}>
              Minhas inscrições
            </NavLink>
          ) : null}
          {session?.role === 'NGO' ? (
            <NavLink to="/ong/eventos" className={navClass}>
              Meus eventos
            </NavLink>
          ) : null}
        </nav>

        <div className="header__actions">
          {signedIn ? (
            <>
              {me?.name ? <span className="header__user">{me.name}</span> : null}
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
