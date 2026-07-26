# ADR 0002 — Remoção de equipe com pilotos associados

- **Status:** Aceito
- **Data:** 2026-07-26
- **Contexto:** Implementação do CRUD de `Team` (Dia 4 do roadmap).

## Contexto

`Driver.teamId` é uma FK obrigatória para `Team` (sem `onDelete: Cascade` no schema). Era preciso decidir o comportamento de `DELETE /teams/:id` quando a equipe possui pilotos vinculados: bloquear a remoção ou apagar os pilotos em cascata.

## Decisão

**Bloquear** a remoção: `DELETE /teams/:id` retorna `409 Conflict` quando a equipe possui ao menos um piloto associado. A equipe só pode ser removida depois que os pilotos forem realocados ou apagados individualmente.

O controller busca a equipe com seus pilotos (`teamRepository.findById`) antes de remover e decide em código de aplicação, em vez de depender do erro `P2003` do Prisma — isso permite devolver a mensagem correta sem `onDelete: Restrict` explícito no schema (que já é o padrão do Prisma na ausência de `onDelete`).

## Alternativas consideradas

- **Cascata (`onDelete: Cascade`):** apagaria pilotos silenciosamente junto com a equipe. Rejeitado: perda de dados sem confirmação explícita do cliente da API, e uma equipe de F1 não "leva" seus pilotos junto ao ser removida do sistema — o domínio real não sustenta esse comportamento.

## Consequências

- Clientes da API precisam remover ou realocar os pilotos antes de remover uma equipe.
- Nenhuma mudança de schema foi necessária (o Prisma já usa `Restrict` como padrão implícito).
- Documentado em `docs/api-contract.md`, seção `DELETE /teams/:id`.
