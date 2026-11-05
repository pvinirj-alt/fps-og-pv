# FpsOg Community — boas-vindas na DM

Configurado para o servidor `1489814390965407824` e o bot existente `1505969274630438992`.

## Ativar

1. No [Developer Portal](https://discord.com/developers/applications), abra o bot existente. Em **Bot**, use **Reset Token**, pois o anterior foi publicado no chat.
2. Ainda em **Bot**, habilite **Server Members Intent**.
3. Abra `install.cmd`. Edite `.env` e coloque o token novo em `DISCORD_TOKEN=`. Guarde esse arquivo no seu PC.
4. Confira se o bot está no servidor. Para um convite, use **OAuth2 → URL Generator**, com `bot` e `applications.commands`, e as permissões **View Channels**, **Send Messages**, **Embed Links** e **Use External Emojis**.
5. Abra `iniciar.cmd` e espere a confirmação no console. O processo precisa permanecer aberto para funcionar.
6. Use `/fpsog_preview` para conferir a mensagem e `/fpsog_receber` para testar sua própria DM.

Se esse bot já roda em outra hospedagem, coordene a troca do token e incorpore esta função na instância existente. A regeneração do token também exige atualizar a hospedagem anterior. Esta pasta é uma instância independente de boas-vindas, e não contém o código dos outros recursos do seu bot.

## Novas entradas

Envia a mensagem aprovada uma vez para novos membros humanos. Em servidores com aceite de regras, aguarda a conclusão. Usa os emojis FpsOg e foguete e os canais de evento e ticket informados.

## Membros atuais

Um administrador com **Gerenciar Servidor** usa `/fpsog_painel` no canal desejado. O botão **Receber na DM** permite que cada membro peça a mensagem.

Também há `/fpsog_enviar_atuais`, limitado a um cargo específico de pessoas que já aceitaram receber esta DM. Para usá-lo, preencha `OPTIN_ROLE_ID` no `.env` e reinicie. Atribua esse cargo somente aos membros que aceitaram. O comando não aceita `@everyone`. A entrega permanece sujeita às configurações de DM de cada membro.

Os comandos `fpsog_` são registrados individualmente no servidor. Os demais comandos cadastrados na aplicação são preservados.

## Entregas e falhas

O histórico fica em `data/deliveries.sqlite`. Preserve esse arquivo ao atualizar ou mudar de hospedagem, para manter a prevenção de duplicações. O banco guarda IDs e estado da entrega, sem copiar o conteúdo de conversas.

Cada envio é registrado antes da chamada ao Discord. Falhas de resultado incerto e quedas durante o envio não são repetidas automaticamente, pois a entrega pode ter ocorrido. Uma DM bloqueada pode ser tentada novamente pelo próprio membro usando `/fpsog_receber` após ajustar suas permissões.

A fila espaça as mensagens e a biblioteca trata os limites da API. Os botões continuam funcionando após reiniciar. Não há varredura automática dos membros anteriores na inicialização.

## Verificação local

Requer Node.js 24 ou superior. Execute `npm test`. Os testes simulam os envios e verificam deduplicação, bloqueio de DM, aceite de regras e a mensagem aprovada.

## Referências

- [Intents de membros](https://discord.com/developers/docs/events/gateway#privileged-intents)
- [Discord Developer Policy](https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy)
- [discord.js](https://discord.js.org/docs/packages/discord.js/14.28.1)
