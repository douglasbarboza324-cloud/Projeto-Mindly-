# Aplicar as correções do Mindly

Este documento resume ajustes do Mindly. Ele **não** contém chaves, `.env.local`, `.git` ou `node_modules`.

## O que foi alterado

- Campo de senha com botão acessível para mostrar/ocultar no login e na redefinição.
- Campo de e-mail com validação nativa, limite de tamanho e prevenção de capitalização automática.
- A tela inicial não exibe mais reações nem formulário de avaliação.
- Exclusão de uma conversa ou de todo o histórico local, sempre com confirmação.

## 1. Aplicar os arquivos

Extraia o ZIP na pasta principal do projeto Mindly (por exemplo, `Downloads/Mindly`) e permita substituir os arquivos existentes. Não apague nem substitua outros arquivos do projeto.

## 2. Autenticação

O Mindly permite entrar apenas com o nome usando usuários anônimos do Supabase. Ative **Authentication → Sign In / Providers → Allow anonymous sign-ins** no painel do Supabase. O acesso por nome fica vinculado ao dispositivo e não pode ser recuperado depois de sair ou limpar os dados do navegador; considere ativar CAPTCHA para proteger a criação de usuários anônimos.

## 3. Testar e publicar

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
- `vercel.json` e as variáveis de ambiente permanecem inalterados.
- Não coloque `AI_API_KEY` no código nem envie `.env.local` ao GitHub. O pacote não inclui arquivos de ambiente.
