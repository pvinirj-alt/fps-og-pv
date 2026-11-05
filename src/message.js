import { EmbedBuilder } from 'discord.js';

export function welcomeEmbed() {
  return new EmbedBuilder()
    .setColor(0x747480)
    .setTitle("Bem-vindo à FpsOg' Community!")
    .setDescription([
      '<:fpsog:1561456570490167418>',
      '',
      'Obrigado por entrar no servidor! Convide seus amigos para fazer parte da comunidade também.',
      '',
      '**<:foguete:1536065581038702683> Veja nossos eventos**',
      "Participe e receba **dias de acesso ao FpsOg' External RedM**. Confira os detalhes em <#1560785298424856577>!",
      '',
      '**Precisa de ajuda?**',
      'Abra um ticket em <#1560391452008120493>!',
      '',
      '> Cheat com **TODAS as funções do mercado**, atualizado diariamente, a partir de **R$ 4,99!** <:fpsog:1561456570490167418>',
      '>',
      "> **FpsOg' no topo!**",
    ].join('\n'));
}
