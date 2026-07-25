# Contrato da API — Formula One API

Base URL (local): `http://localhost:3333`

Todos os corpos de requisição e resposta são JSON. Validação via Zod; erros de validação retornam `400` com detalhamento dos campos.

---

## Recurso: Drivers (`/drivers`)

### Modelo

| Campo | Tipo | Regras |
|---|---|---|
| `id` | string (uuid) | Gerado pelo servidor |
| `name` | string | Obrigatório, 1–80 chars |
| `country` | string | Obrigatório, 2–56 chars |
| `carNumber` | number (int) | Obrigatório, 1–99, único |
| `teamId` | string (uuid) | Obrigatório, deve referenciar uma Team existente |
| `createdAt` | string (ISO 8601) | Gerado pelo servidor |

### Endpoints

#### `GET /drivers`
Lista todos os pilotos.
- **200** → `Driver[]`

#### `GET /drivers/:id`
Busca um piloto por id.
- **200** → `Driver`
- **404** → piloto não encontrado

#### `POST /drivers`
Cadastra um piloto.
- **Body:** `{ name, country, carNumber, teamId }`
- **201** → `Driver` criado
- **400** → payload inválido (ex.: `carNumber` fora de 1–99)
- **409** → `carNumber` já em uso

#### `PUT /drivers/:id`
Atualiza um piloto.
- **Body:** `{ name?, country?, carNumber?, teamId? }`
- **200** → `Driver` atualizado
- **400** → payload inválido
- **404** → piloto não encontrado

#### `DELETE /drivers/:id`
Remove um piloto.
- **204** → sem conteúdo
- **404** → piloto não encontrado

---

## Recurso: Teams (`/teams`)

### Modelo

| Campo | Tipo | Regras |
|---|---|---|
| `id` | string (uuid) | Gerado pelo servidor |
| `name` | string | Obrigatório, 1–80 chars, único |
| `country` | string | Obrigatório, 2–56 chars |
| `foundedYear` | number (int) | Obrigatório, 1900–ano atual |
| `createdAt` | string (ISO 8601) | Gerado pelo servidor |

### Endpoints

#### `GET /teams`
Lista todas as equipes.
- **200** → `Team[]`

#### `GET /teams/:id`
Busca uma equipe por id.
- **200** → `Team` (pode incluir `drivers` associados)
- **404** → equipe não encontrada

#### `POST /teams`
Cadastra uma equipe.
- **Body:** `{ name, country, foundedYear }`
- **201** → `Team` criada
- **400** → payload inválido
- **409** → `name` já em uso

#### `PUT /teams/:id`
Atualiza uma equipe.
- **Body:** `{ name?, country?, foundedYear? }`
- **200** → `Team` atualizada
- **400** → payload inválido
- **404** → equipe não encontrada

#### `DELETE /teams/:id`
Remove uma equipe.
- **204** → sem conteúdo
- **404** → equipe não encontrada
- **409** → equipe possui pilotos associados (decisão: bloquear remoção ou cascatear — ver ADR futuro)

---

## Formato de erro

Erros seguem um formato consistente, produzido pelo error handler global:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "issues": [
    { "path": "carNumber", "message": "Number must be less than or equal to 99" }
  ]
}
```

| Código | Significado |
|---|---|
| 400 | Payload inválido (falha de validação Zod) |
| 404 | Recurso não encontrado |
| 409 | Conflito (violação de unicidade / integridade) |
| 500 | Erro interno inesperado |
