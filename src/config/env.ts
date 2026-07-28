/**
 * Ponto unico de leitura e validacao das variaveis de ambiente.
 *
 * Este arquivo e o unico lugar do projeto que le `process.env`. Qualquer
 * outro modulo importa `env` daqui, ja tipado e validado.
 *
 * A validacao roda na importacao do modulo: se algo estiver ausente ou
 * malformado, a aplicacao encerra imediatamente com uma mensagem clara,
 * em vez de falhar mais tarde com um erro obscuro de conexao.
 */

import 'dotenv/config';
import { z } from 'zod';

/**
 * Valida uma connection string do PostgreSQL.
 *
 * Nao se usa validacao generica de URL aqui: `https://exemplo.com` passaria
 * numa checagem de URL e so quebraria depois, na hora de conectar.
 */
const postgresUrl = z
  .string()
  .min(1, 'nao pode estar vazia')
  .refine(
    (value) => value.startsWith('postgresql://') || value.startsWith('postgres://'),
    { message: 'deve ser uma connection string PostgreSQL (postgresql://...)' },
  );

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  /**
   * O Render injeta PORT automaticamente. O valor padrao serve ao ambiente
   * local. Coeragao e necessaria porque toda variavel de ambiente e string.
   */
  PORT: z.coerce.number().int().min(1).max(65535).default(3333),

  /** Connection string usada pela aplicacao. Em producao, a pooled do Neon. */
  DATABASE_URL: postgresUrl,

  /**
   * Conexao direta, usada apenas pelo CLI do Prisma (migrations), que a le
   * do `prisma.config.ts` — nao daqui.
   *
   * Por isso e opcional: um container que apenas executa a aplicacao nao
   * precisa dela, e exigi-la faria a app falhar ao subir sem motivo real.
   */
  DIRECT_URL: postgresUrl.optional(),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const detalhes = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(raiz)'}: ${issue.message}`)
    .join('\n');

  console.error('\nVariaveis de ambiente invalidas:\n');
  console.error(detalhes);
  console.error('\nConfira o seu .env — use o .env.example como referencia.\n');

  process.exit(1);
}

/** Configuracao validada e imutavel. */
export const env: Env = Object.freeze(parsed.data);

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const isDevelopment = env.NODE_ENV === 'development';