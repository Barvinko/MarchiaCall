import { Injectable, Logger } from '@nestjs/common';
import { Client, Message, TextChannel, GuildMember } from 'discord.js';
import { ConfigService } from '../../config/config.service';
import { MessageSendResult, MilitiaRoleNames } from '../interfaces/discord.interfaces';

@Injectable()
export class DiscordMessageService {
  private readonly logger = new Logger(DiscordMessageService.name);
  private client: Client;

  constructor(private configService: ConfigService) {}

  setClient(client: Client) {
    this.client = client;
  }

  async getMessageById(messageId: string): Promise<Message | null> {
    try {
      // Получаем все доступные серверы
      const guilds = this.client.guilds.cache;
      
      for (const [_, guild] of guilds) {
        // Получаем все текстовые каналы на сервере
        const channels = await guild.channels.fetch();
        
        for (const [_, channel] of channels) {
          // Проверяем, является ли канал текстовым
          if (channel.isTextBased() && !channel.isDMBased()) {
            try {
              const textChannel = channel as TextChannel;
              const message = await textChannel.messages.fetch(messageId);
              if (message) {
                return message;
              }
            } catch (error) {
              // Сообщение не найдено в этом канале, продолжаем поиск
              continue;
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Ошибка при поиске сообщения с ID ${messageId}:`, error);
      return null;
    }
  }

  // Получение участников с определенной ролью
  async getMembersByRole(roleName: string): Promise<GuildMember[]> {
    try {
      const guild = this.client.guilds.cache.get(this.configService.discordGuildId);
      if (!guild) {
        throw new Error('Сервер не найден');
      }
      
      // Загружаем всех участников сервера (может потребоваться для больших серверов)
      await guild.members.fetch();
      
      // Находим роль по имени
      const role = guild.roles.cache.find(r => r.name === roleName);
      if (!role) {
        throw new Error(`Роль "${roleName}" не найдена на сервере`);
      }
      
      // Получаем всех участников с этой ролью
      return Array.from(guild.members.cache.filter(member => member.roles.cache.has(role.id)).values());
    } catch (error) {
      this.logger.error(`Ошибка при получении участников с ролью ${roleName}:`, error);
      throw error;
    }
  }

  // Отправка сообщения участникам с определенной ролью
  async sendMessageToRole(roleName: string, content: string): Promise<MessageSendResult> {
    try {
      const members = await this.getMembersByRole(roleName);
      this.logger.log(`Найдено ${members.length} участников с ролью ${roleName}`);
      
      let success = 0;
      let failed = 0;
      
      for (const member of members) {
        try {
          await member.send(content);
          success++;
          
          // Небольшая задержка, чтобы избежать лимитов API Discord
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          this.logger.error(`Не удалось отправить сообщение участнику ${member.user.tag}:`, error);
          failed++;
        }
      }
      
      return { success, failed };
    } catch (error) {
      this.logger.error(`Ошибка при отправке сообщений участникам с ролью ${roleName}:`, error);
      throw error;
    }
  }

  // Отправка сообщения всем ополченцам
  async sendMessageToAllMilitia(content: string): Promise<MessageSendResult> {
    try {
      const roleNames = [
        MilitiaRoleNames.KREIN,
        MilitiaRoleNames.GADYAV,
        MilitiaRoleNames.BOZEVIN
      ];
      
      const guild = this.client.guilds.cache.get(this.configService.discordGuildId);
      
      if (!guild) {
        throw new Error('Сервер не найден');
      }
      
      // Загружаем всех участников
      await guild.members.fetch();
      
      // Находим все нужные роли
      const roles = roleNames.map(name => guild.roles.cache.find(r => r.name === name)).filter(r => r);
      
      if (roles.length === 0) {
        throw new Error('Ни одна из ролей ополченцев не найдена');
      }
      
      // Получаем всех участников с любой из этих ролей (без дубликатов)
      const membersSet = new Set<GuildMember>();
      
      for (const role of roles) {
        const membersWithRole = guild.members.cache.filter(member => member.roles.cache.has(role.id));
        membersWithRole.forEach(member => membersSet.add(member));
      }
      
      const members = Array.from(membersSet);
      this.logger.log(`Найдено ${members.length} уникальных участников с ролями ополченцев`);
      
      let success = 0;
      let failed = 0;
      
      for (const member of members) {
        try {
          await member.send(content);
          success++;
          
          // Небольшая задержка, чтобы избежать лимитов API Discord
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          this.logger.error(`Не удалось отправить сообщение участнику ${member.user.tag}:`, error);
          failed++;
        }
      }
      
      return { success, failed };
    } catch (error) {
      this.logger.error('Ошибка при отправке сообщений всем ополченцам:', error);
      throw error;
    }
  }
}