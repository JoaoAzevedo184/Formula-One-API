# ADR 0001 — Escolha de stack e arquitetura

- **Status:** Aceito
- **Data:** 2026-07-16
- **Última revisão:** 2026-07-28
- **Contexto:** Desafio DIO (Minimal API em Node.js) evoluído para peça de portfólio back-end.

## Contexto

O desafio original propõe uma Minimal API com Node.js + Fastify servindo dados de um arquivo JSON. Como o objetivo é fortalecer o portfólio para vagas de back-end, a entrega foi elevada para um CRUD completo com banco relacional, validação, documentação, testes, containerização e CI — sem fugir do escopo enxuto adequado a um desafio.

A DIO não exige estrutura de pastas específica, apenas boas práticas, o que dá liberdade para as decisões abaixo.

O foco principal de carreira é Java/Spring Boot e Python/FastAPI. Este projeto existe para demonstrar **versatilidade em Node/TypeScript** aplicando o mesmo rigor de engenharia — não para mudar de stack.

---

## Decisões

### 1. TypeScript desde o início

Nada de começar em JavaScript para migrar depois — seria retrabalho sem ganho. O projeto nasce com `tsconfig` estrito, ESLint (flat config) e Prettier.

**Sobre a versão do TypeScript:** o `latest` do npm é o TypeScript 7 (port nativo), enquanto o `typescript-eslint` declara suporte a `>=4.8.4 <6.1.0`. Instalando todas as dependências em um único comando, o npm resolve automaticamente para a versão 6, sem conflito. Pinar explicitamente é boa prática — protege contra um `npm update` futuro — mas não é obrigatório, e a instalação não falha sem isso.

### 2. Módulos: CommonJS (provisório)

O `package.json` declara `"type": "commonjs"` explicitamente, apesar do `tsconfig` usar `module: NodeNext`.

Isso não foi planejado: a configuração inicial previa ESM, mas o uso de top-level await no `server.ts` gerava erro, e a solução foi manter CommonJS e encapsular a inicialização em uma função `async start()`.

**Consequência prática:** sem top-level await; pacotes distribuídos apenas em ESM exigiriam `import()` dinâmico. Nenhuma dependência atual do projeto tem essa restrição.

**Status desta decisão: provisória.** A migração para `"type": "module"` deve ser reavaliada depois da entrega, com tempo para validar `npm run build && npm start` e a suíte de testes. Registrada aqui porque a documentação do projeto sugeria ESM, e a divergência silenciosa confundiria quem lesse o repositório.

### 3. Fastify como framework

Já indicado pelo desafio. Escolha idiomática: alto desempenho, arquitetura schema-first e ecossistema de plugins.

**Nota de implementação:** os plugins de configuração transversal (`security.ts`, `swagger.ts`, `error-handler.ts`) são chamados **diretamente** em `buildApp`, sem `app.register()`. O `register` cria um contexto encapsulado, e o hook `onRoute` do Swagger não enxergaria as rotas registradas como irmãs na raiz — o sintoma era o `/docs/json` devolver `paths` vazio.

### 4. Zod para validação, via `fastify-type-provider-zod`

O Fastify usa JSON Schema nativamente; TypeBox teria menor atrito de integração. Optou-se por **Zod** por ser o padrão que mais aparece em vagas de mercado, o que aumenta o valor da peça de portfólio.

Com o type-provider, um único schema Zod cumpre **três** papéis: validação em runtime, inferência de tipos (`z.infer`) e geração da documentação Swagger. Isso elimina a duplicação entre validação e documentação.

A fricção de compatibilidade que existia foi resolvida: o `fastify-type-provider-zod@7` declara peer `zod: >=4.1.5`, então o Zod 4 é suportado nativamente.

O mesmo Zod é reaproveitado em `src/config/env.ts` para validar as variáveis de ambiente na inicialização, fazendo a aplicação falhar cedo e com mensagem legível em vez de quebrar depois com erro obscuro de conexão.

### 5. Prisma 7 + PostgreSQL

**PostgreSQL desde o desenvolvimento**, não SQLite. O Prisma trata alguns tipos de forma diferente entre os dois bancos; como o deploy é em Postgres, usá-lo desde o início elimina surpresas. Docker já faz parte do ferramental local, então o custo de subir um Postgres é baixo.

**O Prisma 7 mudou a configuração de conexão**, e isso condiciona vários arquivos:

- O bloco `datasource` do `schema.prisma` **não aceita mais a propriedade `url`**. Incluí-la gera o erro `P1012`.
- A conexão usada pelo CLI (migrations, introspecção) é declarada em `prisma.config.ts`, apontando para `DIRECT_URL`.
- O `PrismaClient` exige um **driver adapter** no construtor. Usa-se `@prisma/adapter-pg`, que atende tanto ao Postgres local quanto ao Neon — assim há um único caminho de código, e só as variáveis de ambiente mudam entre ambientes.
- O client gerado é importado do caminho definido em `output` (`src/generated/prisma`), não de `@prisma/client`.

### 6. Camadas sob demanda

Controllers → Services → Repositories é a estrutura de referência, mas **uma camada só é criada quando tem conteúdo real**. Um service que apenas repassa `return repository.findAll()` é ruído, não arquitetura.

Na prática, **este projeto não tem pasta `services/`**: a avaliação foi que não há regra de negócio além das restrições que o próprio banco garante (unicidade de `carNumber`, chave estrangeira de `teamId`). Os controllers acessam os repositories diretamente.

O mesmo critério eliminou as pastas `data/` e `utils/`, criadas durante o desenvolvimento e removidas por permanecerem vazias. Há ainda um motivo prático: o Git não versiona diretórios vazios, então elas nem sobreviveriam a um clone.

A pasta `config/` foi mantida porque tem conteúdo real — a validação de ambiente descrita na decisão 4.

### 7. `app.ts` separado de `server.ts`

O `app.ts` monta e devolve a instância do Fastify **sem chamar `listen()`**; o `server.ts` lê a configuração validada e sobe o servidor.

Isso permite que os testes importem o `app.ts` e usem `app.inject()` — recurso nativo do Fastify — para disparar requisições **sem abrir porta de rede**. Testes ficam mais rápidos, não dão conflito de porta no CI e dispensam o `supertest`.

### 8. Testes junto com a construção

Cada CRUD é testado assim que implementado (Vitest), não relegado a uma etapa final que, na prática, raramente acontece bem.

Isolamento: banco dedicado `api-formula-one-test` no mesmo container Docker, migrado uma vez no `globalSetup`, com truncamento das tabelas a cada `beforeEach`. O `fileParallelism` está desligado porque os arquivos compartilham o mesmo banco.

### 9. Deploy: Render (web) + Neon (banco)

Levantamento dos planos gratuitos em julho/2026:

| Serviço | Situação | Decisão |
|---|---|---|
| Fly.io | Sem free tier para novos usuários; exige cartão | Descartado |
| Railway | Apenas trial de US$ 5; plano free inutilizável | Descartado |
| Render (web) | Free viável; hiberna após 15 min | **Adotado** |
| Render (Postgres) | Free **expira em 30 dias** | Descartado |
| Neon | Free **permanente**, sem cartão, scale-to-zero | **Adotado** |

O Postgres gratuito do Render expirar em 30 dias é uma armadilha para portfólio de longa duração — o banco simplesmente some. O Neon resolve exatamente esse furo.

**Sobre a região:** o Render opera apenas em Oregon, Ohio, Virgínia, Frankfurt e Singapura — **não há região na América do Sul**. Como o Neon é acessado exclusivamente pela aplicação hospedada no Render (o desenvolvimento local usa Docker), a proximidade que importa é entre os dois serviços, não com o desenvolvedor. Um banco em `sa-east-1` obrigaria cada consulta a atravessar o continente, e uma requisição HTTP costuma disparar mais de uma consulta.

Decisão: **co-localizar Render e Neon na mesma região (Virgínia / `us-east-1`)**, aceitando latência moderada entre o usuário brasileiro e a API em troca de latência mínima entre API e banco.

O Neon fornece **duas** connection strings: a pooled (com `-pooler`) para a aplicação e a direta para o CLI do Prisma, já que operações de schema não funcionam através do pooler.

### 10. CI e CD separados, com o CI como portão

Dois workflows distintos: `ci.yml` (lint, testes e build a cada push e PR) e `cd.yml` (deploy).

O auto-deploy nativo do Render é **desligado**, porque ele não conhece o resultado do CI — um commit que quebra os testes iria para produção do mesmo jeito. Em vez disso, o `cd.yml` dispara o **Deploy Hook** do Render apenas quando o CI conclui com sucesso na `main`.

Isso transforma o CI de selo decorativo em portão real de produção.

Trade-off aceito: o gatilho `workflow_run` é mais frágil que um único workflow com `needs:` — exige guarda explícita de `conclusion == 'success'` e só funciona a partir da branch padrão. A separação foi mantida pela clareza de responsabilidades e por permitir reexecutar o deploy de forma independente.

---

## Consequências

- Aplicação em produção com custo zero e sem prazo de expiração.
- Cold start duplo (Render + Neon) após inatividade; o README precisa avisar isso honestamente.
- Desenvolvimento local depende de Docker, inclusive para rodar os testes.
- Validação e documentação ficam acopladas ao mesmo schema Zod, reduzindo duplicação.
- Sem top-level await enquanto o projeto permanecer em CommonJS.
- Todo pipeline de build fica obrigado a rodar `prisma generate` antes de compilar, já que `src/generated/` não é versionado.

### Armadilhas do pipeline de build

Três consequências diretas de `src/generated/` não ser versionado, todas descobertas em execução:

1. **`prisma generate` precisa rodar antes do `tsc`** em qualquer ambiente de build. Sem isso, a compilação falha com módulo não encontrado.
2. **O `tsc` não copia os `.js` já gerados** — compila apenas `.ts`. Como resultado, `dist/generated` nunca era criado e o servidor quebrava com `MODULE_NOT_FOUND` em produção. Resolvido com um script `postbuild` que copia `src/generated` → `dist/generated`.
3. **O `prisma.config.ts` precisa existir também em runtime.** Como o schema não tem `url` embutida, o `migrate deploy` no container não resolve as variáveis de conexão sem esse arquivo — ele deve ser copiado para o estágio final da imagem, não apenas para o de build. Pelo mesmo motivo, o estágio de build precisa de valores fictícios de `DATABASE_URL` e `DIRECT_URL`: o `prisma generate` carrega o config e exige a presença das variáveis, embora não abra conexão.

---

## Decisões relacionadas

- ADR 0002 — Comportamento do `DELETE /teams/:id` com pilotos associados