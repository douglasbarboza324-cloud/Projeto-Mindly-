# Mindly

Mindly é um aplicativo React 18 + Vite para registrar humor, refletir sobre si, organizar tarefas e adaptar textos. O frontend e a API ficam separados: os dados pessoais continuam no navegador e a API encaminha pedidos de IA ao Ollama configurado no servidor.

## Requisitos

- Node.js 20 ou mais recente
- npm
- Ollama e o modelo `llama3.2:3b` para usar recursos de IA

## Desenvolvimento local

```bash
npm install
```

Inicie o Ollama e baixe o modelo:

```bash
ollama pull llama3.2:3b
ollama serve
```

Copie `backend/.env.example` para `backend/.env`. Abra dois terminais na pasta do projeto:

```bash
cp backend/.env.example backend/.env
```

```bash
npm run backend:dev
```

```bash
npm run dev
```


O Vite encaminha `/api` para a API local na porta 3001; a API encaminha apenas pedidos de chat ao Ollama. Para usar outro modelo ou host, altere `OLLAMA_MODEL` ou `OLLAMA_BASE_URL` em `backend/.env`. Essas variáveis são lidas somente pelo backend, nunca pelo bundle do navegador.

O chat usa `llama3.2:3b` por padrão. Se o Ollama ou o modelo estiverem indisponíveis, o Mindly apresenta um erro e mantém a conversa salva no navegador.

## Publicação com backend

1. Execute `npm run build` e publique os arquivos de `dist/` em um host de frontend.
2. Execute `npm run backend` em um host Node.js 20+, com `HOST=0.0.0.0` para aceitar conexões do proxy da hospedagem.
3. Configure o proxy reverso da hospedagem para encaminhar `/api/*` ao processo Node. O frontend usa caminhos relativos e não precisa receber o endereço do Ollama.
4. Configure `OLLAMA_BASE_URL` e `OLLAMA_MODEL` no ambiente do backend. O processo backend precisa alcançar o servidor Ollama e ter o modelo instalado.
5. Se frontend e API tiverem origens diferentes, defina `CORS_ORIGIN` com a origem pública exata do frontend. Para o mesmo domínio, preserve o cabeçalho `Host` no proxy reverso.
6. Se o gateway remover e recriar `X-Forwarded-For`, configure `TRUST_PROXY=true` no backend para rate limit por IP real. Antes de expor a API à internet, proteja `/api/chat` com autenticação ou controle de acesso e rate limit no gateway da hospedagem. A API também valida tamanho e formato das mensagens, timeout e origem, e aplica um rate limit em memória por IP. CORS não é autenticação e o rate limit em memória deve ser complementado na hospedagem.

A API não grava nem registra o conteúdo das mensagens. Em uma publicação hospedada, o texto enviado ao chat passa pelo backend hospedado e pelo Ollama configurado por você. Não há sincronização de diário, tarefas ou conversas entre navegadores.

## Privacidade e dados locais

O Mindly armazena dados estruturados no `localStorage` e áudios gravados no IndexedDB do navegador atual. Os dados podem ser removidos na página Configurações. O reconhecimento de fala do navegador pode processar áudio conforme a política desse navegador. Em produção, mensagens do chat são encaminhadas ao Ollama pela API do servidor.

## Verificações

```bash
npm run lint
npm run typecheck
npm run build
```
