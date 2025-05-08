import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client, GatewayIntentBits } from 'discord.js';
import { ConfigService } from '../config/config.service';
import { DiscordCommandService } from './services/discord-command.service';
import { DiscordMessageService } from './services/discord-message.service';
import { DiscordSchedulerService } from './services/discord-scheduler.service';
import { SendMessageDto } from './dto/message.dto';
import { ApiSendResult, MilitiaRoleNames } from './interfaces/discord.interfaces';

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

  // API методы для внешнего использования
  async sendMessageByRole(roleType: 'krein' | 'gadyav' | 'bozevin' | 'all', messageDto: SendMessageDto): Promise<ApiSendResult> {
    try {
      const message = await this.messageService.getMessageById(messageDto.messageId);
      if (!message) {
        throw new Error('Сообщение с указанным ID не найдено');
      }

      // Если указано время отправки, планируем отправку
      if (messageDto.scheduleTime) {
        const scheduledTime = new Date(messageDto.scheduleTime);
        const now = new Date();
        
        if (isNaN(scheduledTime.getTime())) {
          throw new Error('Указан неверный формат времени. Используйте формат ISO: YYYY-MM-DDTHH:MM:SS');
        }
        
        if (scheduledTime <= now) {
          throw new Error('Время рассылки должно быть в будущем.');
        }
        
        let scheduleId: string;
        
        switch (roleType) {
          case 'krein':
            scheduleId = this.schedulerService.scheduleMessageToRole(
              MilitiaRoleNames.KREIN,
              message.content,
              scheduledTime,
              messageDto.messageId
            );
            break;
          case 'gadyav':
            scheduleId = this.schedulerService.scheduleMessageToRole(
              MilitiaRoleNames.GADYAV,
              message.content,
              scheduledTime,
              messageDto.messageId
            );
            break;
          case 'bozevin':
            scheduleId = this.schedulerService.scheduleMessageToRole(
              MilitiaRoleNames.BOZEVIN,
              message.content,
              scheduledTime,
              messageDto.messageId
            );
            break;
          case 'all':
            scheduleId = this.schedulerService.scheduleMessageToAllMilitia(
              message.content,
              scheduledTime,
              messageDto.messageId
            );
            break;
        }
        
        return {
          success: true,
          scheduled: true,
          scheduleTime: scheduledTime.toISOString(),
        };
      } else {
        // Отправляем сразу
        let result;
        
        switch (roleType) {
          case 'krein':
            result = await this.messageService.sendMessageToRole(MilitiaRoleNames.KREIN, message.content);
            break;
          case 'gadyav':
            result = await this.messageService.sendMessageToRole(MilitiaRoleNames.GADYAV, message.content);
            break;
          case 'bozevin':
            result = await this.messageService.sendMessageToRole(MilitiaRoleNames.BOZEVIN, message.content);
            break;
          case 'all':
            result = await this.messageService.sendMessageToAllMilitia(message.content);
            break;
        }

        return {
          success: true,
          sent: result.success,
          failed: result.failed
        };
      }
    } catch (error) {
      this.logger.error('Ошибка при отправке сообщения через API:', error);
      throw error;
    }
  }
}