import { Link } from 'react-router'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import './page.css'

export function RegisterChoicePage() {
  useDocumentTitle('Criar conta')
  return (
    <div className="page page-section">
      <header className="page-head">
        <h1 className="page-head__title">Criar conta</h1>
        <p className="page-head__lead">Escolha como você vai usar o Unnia. Dá para mudar de ideia depois, com outra conta.</p>
      </header>
      <div className="choices">
        <Link to="/cadastro/voluntario" className="choice">
          <h2 className="choice__title">Sou voluntário</h2>
          <p className="choice__text">Encontre eventos, reserve sua vaga e converse com as ONGs.</p>
          <span className="choice__go">Criar conta de voluntário →</span>
        </Link>
        <Link to="/cadastro/ong" className="choice">
          <h2 className="choice__title">Represento uma ONG</h2>
          <p className="choice__text">
            Cadastre a organização, crie eventos e acompanhe as inscrições. Publicar exige verificação do CNPJ pela
            equipe do Unnia.
          </p>
          <span className="choice__go">Cadastrar minha ONG →</span>
        </Link>
      </div>
      <p className="form-aside">
        Já tem conta? <Link to="/entrar">Entrar</Link>
      </p>
    </div>
  )
}
