# Unnia Web

Front-end do Unnia, a rede social em que ONGs abrem vagas em eventos solidários e voluntários se inscrevem.
Consome a API do projeto irmão `Unnia` (Spring Boot). React 19, TypeScript, Vite.

## O que o app faz

| Quem | O que faz |
|---|---|
| Visitante | Vê eventos, a vitrine de ONGs e os perfis; cria conta de voluntário ou de ONG |
| Voluntário | Segue ONGs, vê o feed, reage e comenta, se inscreve em eventos, conversa com ONGs |
| ONG | Cria, edita, remarca, publica e encerra eventos; vê os inscritos e registra a presença; divulga eventos no feed |
| Equipe (admin) | Verifica ou recusa ONGs, suspende contas e decide o que fazer com as denúncias |

Todos: perfil editável, troca de senha, notificações (sino no menu), edição das próprias postagens e denúncia de postagens, comentários e contas.

## Como rodar

Pré-requisito: Node 22 ou mais novo, e a API rodando em `http://localhost:8080` (veja o README do backend).

```bash
npm install
npm run dev        # http://localhost:5173
```

Em desenvolvimento, o Vite encaminha `/api` para a API, então o navegador só fala com a própria origem e não
há CORS. Se a API estiver em outra porta: `UNNIA_API_URL=http://localhost:18080 npm run dev`.

Em produção, sirva o front e a API **na mesma origem** (por exemplo, atrás de um proxy reverso). Se precisar
deles em domínios diferentes, defina `VITE_API_URL` no build e libere o CORS no backend, que hoje não o configura.

### Com Docker

O `Dockerfile` empacota o app e o serve com nginx, que também repassa `/api` para a API (endereço em
`API_UPSTREAM`, padrão `http://api:8080`). O `docker-compose.yml` do backend sobe tudo junto, assumindo este
repositório clonado ao lado dele como `../Unnia-web`:

```bash
docker compose --profile app up -d --build     # site em http://localhost:8081
```

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Confere os tipos e gera `dist/` |
| `npm test` | Testes unitários (Vitest + Testing Library) |
| `npm run lint` | Oxlint |

O CI (`.github/workflows/ci.yml`) roda lint, testes e build, e confere que a imagem Docker compila.

## Estrutura

```
src/
  lib/api/        cliente HTTP, sessão, erros e endpoints tipados (o contrato com o backend)
  lib/            formatação de datas, erros de formulário, relógio compartilhado
  features/       uma pasta por área: auth, events, social, moderation, messaging, notifications,
                  profiles, admin (consultas à API, componentes e regras daquela área)
  components/     Button, Field, toasts, layout, estados vazios
  pages/          uma página por rota
  styles/         tokens (cor, tipografia, espaço) e base
```

Os componentes de tela são puros (recebem dados e callbacks) e ficam separados dos contêineres que falam com a
API, o que permite testá-los sem rede.

## Contrato com a API

O front e a API evoluem juntos: **toda mudança de rota, DTO, status HTTP ou regra visível no backend deve ser
refletida aqui**, no mesmo trabalho. Os pontos de contato são:

- `src/lib/api/types.ts`: espelha os DTOs.
- `src/lib/api/endpoints.ts`: as rotas.
- `src/lib/api/client.ts`: sessão, renovação de token e tratamento de `401` e `429`.
- `src/features/events/eventPolicy.ts`: espelha as regras do backend sobre quem pode inscrever, cancelar,
  publicar, editar e registrar presença.
- `src/features/notifications/target.ts`: o que o `referenceId` de cada tipo de notificação aponta.

### Sessão

O login devolve um JWT de acesso (15 min) e um refresh token opaco de uso único (30 dias). O de acesso fica só
em memória; o de renovação, em `localStorage`. Como o refresh token é de uso único e reapresentá-lo derruba a
sessão inteira no backend, **as renovações são serializadas**: uma promessa compartilhada na aba e um Web Lock
entre abas, relendo sempre o token mais recente do storage. Isso está coberto por testes.

Trocar a senha encerra todas as sessões da conta no servidor, então o app faz logout e leva ao login.

### Atualização sem push

A API não empurra novidades. Mensagens, notificações e a contagem de pendências do admin são consultadas de
tempos em tempos (8 a 60 segundos) enquanto a aba está aberta.

### Limite de requisições

A API responde `429` com `Retry-After`. O cliente converte isso em `RateLimitError`, e as telas mostram quanto
esperar ("Tente de novo em 15 minutos").

## Design

Paleta do universo do voluntariado: tinta `#0E1330`, azul-ultramar `#2338D0` e o **amarelo-colete** `#FFD21F`
que marca as vagas ocupadas. Títulos em Bricolage Grotesque, texto em Instrument Sans, datas e contagens em
DM Mono (a letra de uma lista de presença).

A assinatura visual é a **fileira de vagas** (`SlotStrip`): cada vaga é uma linha de assinatura, e as ocupadas
ficam marcadas em amarelo. Ela mostra, de relance, o que os números dizem, e nunca os contradiz: não aparece
cheia se ainda há vaga, nem vazia se já há inscritos. Respeita `prefers-reduced-motion`.

## Endereço pelo CEP

Os formulários com endereço (cadastros, evento novo, edição de evento e de perfil) usam o [ViaCEP](https://viacep.com.br), serviço público e gratuito consultado direto do navegador (`src/lib/viacep.ts`). Ao completar os 8 números do CEP, o app preenche rua, bairro, cidade e estado; tudo continua editável, e se o ViaCEP estiver fora do ar a pessoa preenche à mão. A API recebe `address` (rua, número, complemento e bairro numa linha), `city`, `state` (UF) e `cep`. O CEP é obrigatório nos cadastros novos e opcional nas edições, porque registros antigos não o têm.

## Confirmação de e-mail

Depois do cadastro, a pessoa vai para `/confirme-seu-email` (reenvio com espera de 1 minuto) e só entra depois de abrir o link, que cai em `/verificar-email`. Um 403 no login leva à mesma tela.

## Limites conhecidos

- Não há tela para promover alguém a administrador (a API também não oferece): o administrador é o da seed.
- Postagens aceitam texto e o atalho para um evento; a API prevê mídia (imagem e vídeo), mas não há upload.
