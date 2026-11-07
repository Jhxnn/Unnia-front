# Unnia Web

Front-end do Unnia, a rede social em que ONGs abrem vagas em eventos solidários e voluntários se inscrevem.
Consome a API do projeto irmão `Unnia` (Spring Boot). React 19, TypeScript, Vite.

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

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Confere os tipos e gera `dist/` |
| `npm test` | Testes unitários (Vitest + Testing Library) |
| `npm run lint` | Oxlint |

## Estrutura

```
src/
  lib/api/        cliente HTTP, sessão, erros e endpoints tipados (o contrato com o backend)
  lib/            formatação de datas, erros de formulário, relógio compartilhado
  features/       auth (sessão, guarda de rota) e events (cartão, fileira de vagas, política de ações)
  components/     Button, Field, toasts, layout, estados vazios
  pages/          uma página por rota
  styles/         tokens (cor, tipografia, espaço) e base
```

## Contrato com a API

O front e a API evoluem juntos: **toda mudança de rota, DTO, status HTTP ou regra visível no backend deve ser
refletida aqui**, no mesmo trabalho. Os pontos de contato são:

- `src/lib/api/types.ts`: espelha os DTOs.
- `src/lib/api/endpoints.ts`: as rotas.
- `src/lib/api/client.ts`: sessão, renovação de token e tratamento de `401` e `429`.
- `src/features/events/eventPolicy.ts`: espelha as regras do backend sobre quem pode inscrever, cancelar e publicar.

### Sessão

O login devolve um JWT de acesso (15 min) e um refresh token opaco de uso único (30 dias). O de acesso fica só
em memória; o de renovação, em `localStorage`. Como o refresh token é de uso único e reapresentá-lo derruba a
sessão inteira no backend, **as renovações são serializadas**: uma promessa compartilhada na aba e um Web Lock
entre abas, relendo sempre o token mais recente do storage. Isso está coberto por testes.

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

## O que ainda não existe

Feed e postagens, mensagens, notificações, perfis editáveis e o painel de administração (verificar ONGs,
moderar denúncias). A API já oferece tudo isso; falta a interface.
