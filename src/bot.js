import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, Events,
  GatewayIntentBits, PermissionFlagsBits, REST, Routes, SlashCommandBuilder,
} from 'discord.js';
import { DeliveryStore } from './store.js';
import { DeliveryQueue } from './delivery.js';
import { welcomeEmbed } from './message.js';

const token = process.env.DISCORD_TOKEN?.trim();
const guildId = process.env.DISCORD_GUILD_ID;
const clientId = process.env.DISCORD_CLIENT_ID;
const optinRole = process.env.OPTIN_ROLE_ID?.trim();
if (!token || !/^\d{17,20}$/.test(guildId ?? '') || !/^\d{17,20}$/.test(clientId ?? '')) {
  console.error('Preencha DISCORD_TOKEN, DISCORD_CLIENT_ID e DISCORD_GUILD_ID no arquivo .env.');
  process.exit(1);
}
if (optinRole && !/^\d{17,20}$/.test(optinRole)) {
  console.error('OPTIN_ROLE_ID deve ser o ID de um cargo de consentimento.');
  process.exit(1);
}
const data = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH
  || fileURLToPath(new URL('../data/', import.meta.url));
if (process.env.RAILWAY_ENVIRONMENT_ID && !process.env.DATA_DIR && !process.env.RAILWAY_VOLUME_MOUNT_PATH) {
  console.error('Conecte um volume Railway em /data para preservar o histórico de entregas.');
  process.exit(1);
}
mkdirSync(data, { recursive: true });
const store = new DeliveryStore(join(data, 'deliveries.sqlite'));
const queue = new DeliveryQueue(store, () => ({
  embeds: [welcomeEmbed()], allowedMentions: { parse: [] },
}));
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
let campaignRunning = false;

const commands = [
  new SlashCommandBuilder().setName('fpsog_preview').setDescription('Ver a mensagem de boas-vindas.'),
  new SlashCommandBuilder().setName('fpsog_receber').setDescription('Receber as boas-vindas na sua DM.'),
  new SlashCommandBuilder().setName('fpsog_painel').setDescription('Publicar o botão para receber a mensagem na DM.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder().setName('fpsog_enviar_atuais')
    .setDescription('Enviar uma vez para membros com o cargo de consentimento configurado.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
].map(command => command.setDMPermission(false).toJSON());

client.once(Events.ClientReady, async () => {
  try {
    if (client.user.id !== clientId) throw new Error('application_mismatch');
    const guild = await client.guilds.fetch(guildId);
    const rest = new REST().setToken(token);
    // POST upserts only these command names, preserving other commands on this application.
    for (const body of commands) {
      await rest.post(Routes.applicationGuildCommands(clientId, guildId), { body });
    }
    console.log(`FpsOg conectado ao servidor ${guild.name}. Boas-vindas prontas.`);
  } catch {
    console.error('Falha na configuração. Confira o ID do bot, servidor, convite e permissões.');
    await client.destroy();
    process.exitCode = 1;
  }
});

async function welcome(member) {
  if (member.guild.id !== guildId) return;
  try {
    await queue.enqueue(member);
  } catch {
    console.error('Falha local na fila de boas-vindas. Confira o espaço livre e o banco de dados.');
  }
}
client.on(Events.GuildMemberAdd, welcome);
client.on(Events.GuildMemberUpdate, (before, after) => {
  if (before.pending && !after.pending) void welcome(after);
});

const deliveryText = {
  sent: 'Mensagem enviada na sua DM!',
  blocked: 'O Discord bloqueou a DM. Permita mensagens deste servidor e use /fpsog_receber novamente.',
  pending: 'Sua mensagem já está na fila.',
  uncertain: 'Não foi possível confirmar a entrega. A equipe pode conferir o registro local.',
  ignored: 'Aguarde concluir a entrada e aceitar as regras do servidor.',
  left: 'Sua participação no servidor não foi encontrada.',
};

async function receive(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const member = await interaction.guild.members.fetch(interaction.user.id);
  const previous = store.status(guildId, member.id);
  if (previous === 'sent') {
    await interaction.editReply('Você já recebeu essa mensagem. Confira sua conversa com o bot.');
    return;
  }
  const result = await queue.enqueue(member, true);
  await interaction.editReply(deliveryText[result] ?? 'Confira sua conversa com o bot.');
}

async function handle(interaction) {
  if (interaction.guildId !== guildId) return;
  if (interaction.isButton()) {
    if (interaction.customId === 'fpsog:welcome:v1') await receive(interaction);
    return;
  }
  if (!interaction.isChatInputCommand() || !interaction.commandName.startsWith('fpsog_')) return;
  if (interaction.commandName === 'fpsog_receber') return receive(interaction);
  if (interaction.commandName === 'fpsog_preview') {
    return interaction.reply({ embeds: [welcomeEmbed()], ephemeral: true, allowedMentions: { parse: [] } });
  }
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ content: 'Você precisa da permissão Gerenciar Servidor.', ephemeral: true });
  }
  if (interaction.commandName === 'fpsog_painel') {
    await interaction.deferReply({ ephemeral: true });
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
      .setCustomId('fpsog:welcome:v1').setLabel('Receber na DM').setStyle(ButtonStyle.Secondary));
    await interaction.channel.send({
      content: "**FpsOg' Community**\nClique para receber na sua DM as boas-vindas e os detalhes dos eventos.",
      components: [row], allowedMentions: { parse: [] },
    });
    await interaction.editReply('Botão publicado neste canal.');
  }
  if (interaction.commandName === 'fpsog_enviar_atuais') {
    if (!optinRole) {
      return interaction.reply({ content: 'Configure OPTIN_ROLE_ID com um cargo de quem aceitou receber a DM, ou publique /fpsog_painel.', ephemeral: true });
    }
    if (campaignRunning) return interaction.reply({ content: 'Já existe um envio em andamento.', ephemeral: true });
    campaignRunning = true;
    await interaction.deferReply({ ephemeral: true });
    try {
      await interaction.guild.roles.fetch(optinRole);
      if (optinRole === guildId || !interaction.guild.roles.cache.has(optinRole)) {
        await interaction.editReply('O cargo de consentimento é inválido. Escolha um cargo específico.');
        return;
      }
      await interaction.guild.members.fetch();
      const members = [...interaction.guild.members.cache.values()]
        .filter(member => !member.user.bot && !member.pending && member.roles.cache.has(optinRole));
      await interaction.editReply(`Envio iniciado para até ${members.length} membros que aceitaram a DM. O histórico evita repetições.`);
      const totals = {};
      for (const member of members) {
        // Check again in case consent was withdrawn during a long campaign.
        const current = await interaction.guild.members.fetch({ user: member.id, force: true }).catch(() => null);
        if (!current?.roles.cache.has(optinRole)) continue;
        const result = await queue.enqueue(current);
        totals[result] = (totals[result] ?? 0) + 1;
      }
      console.log('Envio aos membros atuais concluído.', totals);
    } finally {
      campaignRunning = false;
    }
  }
}

client.on(Events.InteractionCreate, interaction => {
  void handle(interaction).catch(async () => {
    console.error('Não foi possível concluir um comando do FpsOg.');
    try {
      if (interaction.deferred) await interaction.editReply('Falha ao concluir. Confira as permissões do bot e o registro local.');
      else if (!interaction.replied) await interaction.reply({ content: 'Falha ao concluir a solicitação.', ephemeral: true });
    } catch { /* The interaction may have expired. */ }
  });
});
client.on(Events.Error, () => console.error('Erro de conexão com o Discord.'));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    await client.destroy();
    await queue.tail;
    store.close();
  });
}
client.login(token).catch(() => {
  console.error('Falha no login. Confira o token e habilite Server Members Intent no Developer Portal.');
  process.exitCode = 1;
});
