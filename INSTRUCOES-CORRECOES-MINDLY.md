# Aplicar as correções do Mindly

Este pacote contém somente os arquivos alterados e a nova migração de feedback. Ele **não** contém `api/chat.ts`, `vercel.json`, chaves, `.env.local`, `.git` ou `node_modules`.

## O que foi alterado

- Campo de senha com botão acessível para mostrar/ocultar no login e no cadastro.
- Campo de e-mail com validação nativa, limite de tamanho e prevenção de capitalização automática.
- Área inicial convertida em formulário de avaliação do aplicativo, com nota, comentário opcional e confirmação.
- Exclusão de uma conversa ou de todo o histórico local, sempre com confirmação.

## 1. Aplicar os arquivos

Extraia o ZIP na pasta principal do projeto Mindly (por exemplo, `Downloads/Mindly`) e permita substituir os arquivos existentes. Não apague nem substitua outros arquivos do projeto.

## 2. Criar a tabela de feedback no Supabase

A nova avaliação usa a tabela `public.feedback`. Para ativá-la:

1. Abra o projeto no Supabase.
2. Entre em **SQL Editor**.
3. Abra o arquivo `supabase/migrations/202611190001_feedback.sql` deste pacote.
4. Copie todo o SQL, cole no SQL Editor e execute.

A tabela usa Row Level Security: cada usuário autenticado só pode enviar e consultar seus próprios registros. O comentário é opcional e limitado a 1.000 caracteres.

## 3. Autenticação

O aplicativo oferece cadastro, login e recuperação de senha por e-mail com o Supabase Auth. A confirmação de cadastro respeita a política de confirmação de e-mail configurada no Supabase.

## 4. Testar e publicar

Na pasta principal do projeto, execute:

```bash
npm install
npm run build
```

Se o build terminar sem erros, publique com:

```bash
npx vercel --prod
```

## Observações importantes

- O histórico do chat deste projeto é armazenado no `localStorage` do navegador. Os novos botões apagam uma conversa ou todo esse histórico **neste navegador/dispositivo**; não apagam conversas de outros dispositivos.
- A API do Groq permanece no arquivo `api/chat.ts` original, sem alterações neste pacote. `vercel.json` e as variáveis de ambiente também não foram modificados.
- Não coloque `AI_API_KEY` no código nem envie `.env.local` ao GitHub. O pacote não inclui arquivos de ambiente.
