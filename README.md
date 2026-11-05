# FpsOg Welcome Bot

Bot de boas-vindas para o servidor `1489814390965407824`, com a mensagem aprovada, os emojis e os links dos eventos e suporte.

## Publicar no Railway

1. Suba os arquivos desta pasta em um repositório privado no GitHub. O `Dockerfile` e o `package.json` precisam estar na raiz. `.env`, `node_modules` e `data` ficam fora do Git.
2. No projeto Railway existente, clique em **New / Add → GitHub Repo** e escolha esse repositório. Use um serviço novo chamado `FpsOg-BoasVindas`.
3. Conecte um **Volume** ao novo serviço e configure o caminho de montagem `/data`. O histórico SQLite ficará nesse volume e será preservado entre deploys. Mantenha uma réplica.
4. Em **Variables**, adicione os valores abaixo.

| Variável | Valor |
|---|---|
| `DISCORD_TOKEN` | Token novo gerado no Developer Portal |
| `DISCORD_CLIENT_ID` | `1505969274630438992` |
| `DISCORD_GUILD_ID` | `1489814390965407824` |
| `OPTIN_ROLE_ID` | Opcional, cargo de quem aceitou receber a DM |

O caminho do volume é lido automaticamente de `RAILWAY_VOLUME_MOUNT_PATH`. O bot recusa iniciar no Railway sem um caminho persistente. Não precisa de domínio público nem porta HTTP.

5. No Discord Developer Portal, habilite **Server Members Intent**. O bot deve estar convidado para o servidor, com escopos `bot` e `applications.commands` e permissões de ver canal, enviar mensagens, incorporar links e usar emojis externos.
6. Faça o deploy e aguarde a mensagem de conexão nos logs. Teste `/fpsog_preview` e depois `/fpsog_receber` no seu próprio usuário.

## Bot que já existe

Este projeto usa a conta de bot configurada em `DISCORD_CLIENT_ID`. Cadastre o token novo nas variáveis do Railway. Um token publicado deve ser regenerado.

Se essa mesma conta de bot já executa a loja, os tickets ou outro recurso, integre este módulo ao código daquele serviço ou coordene a mudança antes de trocar o token. Esta pasta contém somente boas-vindas. Ela preserva os comandos existentes na aplicação, mas não implementa seus handlers anteriores. O reset do token também precisa ser atualizado no serviço antigo.

## Comandos

- `/fpsog_preview` mostra a mensagem para você.
- `/fpsog_receber` pede a mensagem na própria DM.
- `/fpsog_painel` publica um botão para membros atuais pedirem a DM. Requer Gerenciar Servidor.
- `/fpsog_enviar_atuais` envia uma vez para os membros de um cargo de consentimento configurado em `OPTIN_ROLE_ID`. Requer Gerenciar Servidor.

Novos membros recebem automaticamente depois de aceitar as regras, quando o servidor usa triagem de membros. O histórico impede repetições. DMs bloqueadas são informadas, e o membro pode pedir uma nova tentativa.

## Rodar localmente

Requer Node.js 24 ou superior. Execute `npm ci --ignore-scripts`, copie `.env.example` para `.env`, configure o token e execute `npm start`. No Windows, há também `install.cmd` e `iniciar.cmd`.

Teste com `npm test`.

## Referências da hospedagem

- [Dockerfiles no Railway](https://docs.railway.com/builds/dockerfiles)
- [Volumes persistentes](https://docs.railway.com/volumes)
- [Configuração como código](https://docs.railway.com/config-as-code/reference)
