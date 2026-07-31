# Documentação da API — Formula One API

Versão do contrato: **1.0**

| Ambiente | Base URL |
|---|---|
| Local | `http://localhost:3333` |
| Produção | `https://formula-one-api.onrender.com` |

Documentação interativa (Swagger UI): `/docs`

---

## Convenções gerais

- Todo corpo de requisição e resposta é `application/json`.
- Identificadores são **UUID v4** gerados pelo servidor. Não envie `id` no corpo.
- Datas seguem **ISO 8601 em UTC** (`2026-07-25T19:23:15.000Z`).
- **Não há autenticação.** A API é pública e serve a fins de demonstração.
- **CORS** habilitado para qualquer origem.
- **Rate limit** aplicado por IP. Ao exceder, a resposta é `429` com o header `retry-after`.
- Campos não reconhecidos no corpo são rejeitados com `400` (validação estrita do Zod).

---

## Recurso: Drivers

### Modelo

| Campo | Tipo | Origem | Regras |
|---|---|---|---|
| `id` | `string` (uuid) | servidor | somente leitura |
| `name` | `string` | cliente | obrigatório, 1–80 caracteres |
| `country` | `string` | cliente | obrigatório, 2–56 caracteres |
| `carNumber` | `integer` | cliente | obrigatório, 1–99, **único** |
| `teamId` | `string` (uuid) | cliente | obrigatório, deve existir em `teams` |
| `createdAt` | `string` (ISO 8601) | servidor | somente leitura |

---

### `GET /drivers`

Lista todos os pilotos.

**Resposta `200`**
```json
[
  {
    "id": "3f2a9c14-8b7e-4d21-9a05-6c1e3f8b2d47",
    "name": "Ayrton Senna",
    "country": "Brasil",
    "carNumber": 12,
    "teamId": "b81c4e0a-5f3d-4a92-8e17-2d9c6a0f4b83",
    "createdAt": "2026-07-25T19:23:15.000Z"
  }
]
```

Retorna `[]` quando não há registros — nunca `404`.

---

### `GET /drivers/:id`

Busca um piloto pelo identificador.

| Status | Situação |
|---|---|
| `200` | Piloto encontrado |
| `400` | `id` não é um UUID válido |
| `404` | Piloto inexistente |

---

### `POST /drivers`

Cadastra um piloto.

**Requisição**
```json
{
  "name": "Ayrton Senna",
  "country": "Brasil",
  "carNumber": 12,
  "teamId": "b81c4e0a-5f3d-4a92-8e17-2d9c6a0f4b83"
}
```

| Status | Situação |
|---|---|
| `201` | Criado — devolve o recurso completo |
| `400` | Payload inválido (campo ausente, `carNumber` fora de 1–99, `teamId` não é UUID) |
| `404` | A equipe informada em `teamId` não existe |
| `409` | `carNumber` já está em uso |

---

### `PUT /drivers/:id`

Atualiza um piloto. Todos os campos são opcionais; envie apenas o que mudou.

**Requisição**
```json
{
  "carNumber": 27
}
```

| Status | Situação |
|---|---|
| `200` | Atualizado — devolve o recurso completo |
| `400` | Payload inválido ou corpo vazio |
| `404` | Piloto ou equipe inexistente |
| `409` | `carNumber` já está em uso por outro piloto |

---

### `DELETE /drivers/:id`

Remove um piloto.

| Status | Situação |
|---|---|
| `204` | Removido — sem corpo na resposta |
| `400` | `id` não é um UUID válido |
| `404` | Piloto inexistente |

---

## Recurso: Teams

### Modelo

| Campo | Tipo | Origem | Regras |
|---|---|---|---|
| `id` | `string` (uuid) | servidor | somente leitura |
| `name` | `string` | cliente | obrigatório, 1–80 caracteres, **único** |
| `country` | `string` | cliente | obrigatório, 2–56 caracteres |
| `foundedYear` | `integer` | cliente | obrigatório, entre 1900 e o ano corrente |
| `createdAt` | `string` (ISO 8601) | servidor | somente leitura |
| `drivers` | `Driver[]` | servidor | presente apenas em `GET /teams/:id` |

---

### `GET /teams`

Lista todas as equipes. Não inclui os pilotos.

**Resposta `200`**
```json
[
  {
    "id": "b81c4e0a-5f3d-4a92-8e17-2d9c6a0f4b83",
    "name": "McLaren",
    "country": "Reino Unido",
    "foundedYear": 1963,
    "createdAt": "2026-07-25T19:23:15.000Z"
  }
]
```

---

### `GET /teams/:id`

Busca uma equipe, **incluindo seus pilotos**.

**Resposta `200`**
```json
{
  "id": "b81c4e0a-5f3d-4a92-8e17-2d9c6a0f4b83",
  "name": "McLaren",
  "country": "Reino Unido",
  "foundedYear": 1963,
  "createdAt": "2026-07-25T19:23:15.000Z",
  "drivers": [
    {
      "id": "3f2a9c14-8b7e-4d21-9a05-6c1e3f8b2d47",
      "name": "Ayrton Senna",
      "country": "Brasil",
      "carNumber": 12,
      "createdAt": "2026-07-25T19:23:15.000Z"
    }
  ]
}
```

| Status | Situação |
|---|---|
| `200` | Equipe encontrada |
| `400` | `id` não é um UUID válido |
| `404` | Equipe inexistente |

---

### `POST /teams`

**Requisição**
```json
{
  "name": "McLaren",
  "country": "Reino Unido",
  "foundedYear": 1963
}
```

| Status | Situação |
|---|---|
| `201` | Criada |
| `400` | Payload inválido (ex.: `foundedYear` anterior a 1900 ou no futuro) |
| `409` | `name` já está em uso |

---

### `PUT /teams/:id`

Campos opcionais.

| Status | Situação |
|---|---|
| `200` | Atualizada |
| `400` | Payload inválido ou corpo vazio |
| `404` | Equipe inexistente |
| `409` | `name` já está em uso por outra equipe |

---

### `DELETE /teams/:id`

| Status | Situação |
|---|---|
| `204` | Removida |
| `400` | `id` não é um UUID válido |
| `404` | Equipe inexistente |
| `409` | Equipe possui pilotos associados |

> A remoção é **bloqueada** quando a equipe possui pilotos associados — ver `docs/adr/0002-remocao-de-equipe.md`.

---

## Formato de erro

Todos os erros seguem a mesma estrutura, produzida pelo handler global:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Falha de validação",
  "issues": [
    { "path": "carNumber", "message": "Número deve estar entre 1 e 99" },
    { "path": "name", "message": "Campo obrigatório" }
  ]
}
```

O array `issues` aparece **somente** em erros de validação (`400`). Nos demais casos o objeto tem apenas `statusCode`, `error` e `message`.

### Catálogo de status

| Status | Quando ocorre |
|---|---|
| `200` | Sucesso em leitura ou atualização |
| `201` | Recurso criado |
| `204` | Recurso removido (sem corpo) |
| `400` | Falha de validação do Zod ou UUID malformado |
| `404` | Recurso não encontrado |
| `409` | Violação de unicidade ou de integridade referencial |
| `429` | Rate limit excedido |
| `500` | Erro interno não previsto |

### Mapeamento de erros do Prisma

O handler traduz erros do Prisma para status HTTP:

| Código Prisma | Significado | Status |
| Código Prisma | Significado | Status |
|---|---|---|
| `P2002` | Violação de restrição única | `409` |
| `P2003` | Violação de chave estrangeira em `DELETE` (recurso possui dependentes) | `409` |
| `P2003` | Violação de chave estrangeira em `POST`/`PUT` (referência inexistente) | `404` |
| `P2025` | Registro não encontrado | `404` |

Erros não mapeados viram `500`, com a mensagem interna registrada no log e **não** exposta na resposta.

---

## Exemplos de uso (PowerShell)

No PowerShell, use `curl.exe` com a extensão — `curl` puro é apelido de `Invoke-WebRequest` e se comporta de forma diferente.

```powershell
# Listar pilotos
curl.exe http://localhost:3333/drivers

# Remover um piloto
curl.exe -X DELETE http://localhost:3333/drivers/3f2a9c14-8b7e-4d21-9a05-6c1e3f8b2d47
```

Para envio de JSON, o `Invoke-RestMethod` é bem mais confortável que escapar aspas no `curl.exe`:

```powershell
$body = @{
  name        = "McLaren"
  country     = "Reino Unido"
  foundedYear = 1963
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3333/teams -Method Post `
  -ContentType "application/json" -Body $body
```

---

## Health check

### `GET /health`

Verificação de disponibilidade. Usado pelo Render e pelo healthcheck do Docker.

**Resposta `200`**
```json
{ "status": "ok", "uptime": 1423.87 }
```