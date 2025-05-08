import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client, GatewayIntentBits } from 'discord.js';
import { ConfigService } from '../config/config.service';
import { DiscordCommandService } from './services/discord-command.service';
import { DiscordMessageService } from './services/discord-message.service';
import { DiscordSchedulerService } from './services/discord-scheduler.service';

@Injectable()
export class DiscordService implements OnModuleInit {
  private client: Client;
  private readonly logger = new Logger(DiscordService.name);

  constructor(
    private configService: ConfigService,
    private commandService: DiscordCommandService,
    private messageService: DiscordMessageService,
    private schedulerService: DiscordSchedulerService,
  ) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.GuildMembers,
      ],
    });

    // Устанавливаем зависимости между сервисами
    this.messageService.setClient(this.client);
    this.schedulerService.setMessageService(this.messageService);
  }

  async onModuleInit() {
    this.client.on('ready', () => {
      this.logger.log(`Бот авторизован как ${this.client.user.tag}`);
      this.commandService.registerCommands(this.client);

      this.logDebugInfo();
    });

    this.client.on('interactionCreate', async (interaction) => {
      this.commandService.handleInteraction(interaction);
    });

    // Обработка ошибок
    this.client.on('error', (error) => {
      this.logger.error('Ошибка Discord клиента:', error);
    });

    await this.client.login(this.configService.discordToken);
  }

  private logDebugInfo() {
    console.log(`Бот авторизован как ${this.client.user.tag}`);
    console.log(`ID бота: ${this.client.user.id}`);
    console.log('Настроенные интенты:');
    console.log(this.client.options.intents);
    const users = this.client.users.cache.size;
    console.log(`Доступно пользователей: ${users}`);
    // Проверка доступа к серверам
    const guilds = this.client.guilds.cache.size;
    console.log(`Доступно серверов: ${guilds}`);
    // Если есть серверы, проверим каналы
    if (guilds > 0) {
      const firstGuild = this.client.guilds.cache.first();
      console.log(`Имя сервера: ${firstGuild.name}`);
      console.log(`Каналы: ${firstGuild.channels.cache.size}`);
    }
  }
}
