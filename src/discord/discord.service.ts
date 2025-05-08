import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
  Client,
  GatewayIntentBits,
  Message,
  TextChannel,
  GuildMember,
} from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { SendMessageDto } from './dto/message.dto';
import { SlashCommandBuilder } from '@discordjs/builders';
import { ConfigService } from '../config/config.service';

@Injectable()
export class DiscordService implements OnModuleInit {
  private client: Client;
  private readonly logger = new Logger(DiscordService.name);
  private scheduledMessages: Map<string, NodeJS.Timeout> = new Map();

  constructor(private configService: ConfigService) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.GuildMembers, // Важно для получения списка участников с ролями
      ],
    });
  }

  async onModuleInit() {
    this.client.on('ready', () => {
      this.logger.log(`Бот авторизован как ${this.client.user.tag}`);
      this.registerCommands();
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
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isCommand()) return;
      try {
        const { commandName } = interaction;
        const messageId = interaction.options.get('message_id')
          ?.value as string;
        const scheduleTime = interaction.options.get('schedule_time')
          ?.value as string;

        await interaction.deferReply({ ephemeral: true });

        switch (commandName) {
          case 'sendkrein':
            await this.handleSendMessage(
              interaction,
              messageId,
              'Ополченец Крейна',
              scheduleTime,
            );
            break;
          case 'sendgadyav':
            await this.handleSendMessage(
              interaction,
              messageId,
              'Ополченец Гадява',
              scheduleTime,
            );
            break;
          case 'sendbozevin':
            await this.handleSendMessage(
              interaction,
              messageId,
              'Ополченец Бозевина',
              scheduleTime,
            );
            break;
          case 'sendall':
            await this.handleSendAllMessage(
              interaction,
              messageId,
              scheduleTime,
            );
            break;
        }
      } catch (error) {
        this.logger.error('Ошибка при обработке команды:', error);
        try {
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply(
              'Произошла ошибка при выполнении команды.',
            );
          } else {
            await interaction.reply({
              content: 'Произошла ошибка при выполнении команды.',
              ephemeral: true,
            });
          }
        } catch (replyError) {
          this.logger.error('Ошибка при ответе на команду:', replyError);
        }
      }
    });

    // Обработка ошибок
    this.client.on('error', (error) => {
      this.logger.error('Ошибка Discord клиента:', error);
    });

    await this.client.login(this.configService.discordToken);
  }

  private async registerCommands() {
    try {
      const commands = [
        new SlashCommandBuilder()
          .setName('sendkrein')
          .setDescription('Отправить сообщение ополченцам Крейна')
          .addStringOption((option) =>
            option
              .setName('message_id')
              .setDescription('ID сообщения для рассылки')
              .setRequired(true),
          )
          .addStringOption((option) =>
            option
              .setName('schedule_time')
              .setDescription(
                'Время отправки (ISO формат, например: 2025-05-07T14:30:00)',
              )
              .setRequired(false),
          ),
        new SlashCommandBuilder()
          .setName('sendgadyav')
          .setDescription('Отправить сообщение ополченцам Гадява')
          .addStringOption((option) =>
            option
              .setName('message_id')
              .setDescription('ID сообщения для рассылки')
              .setRequired(true),
          )
          .addStringOption((option) =>
            option
              .setName('schedule_time')
              .setDescription(
                'Время отправки (ISO формат, например: 2025-05-07T14:30:00)',
              )
              .setRequired(false),
          ),
        new SlashCommandBuilder()
          .setName('sendbozevin')
          .setDescription('Отправить сообщение ополченцам Бозевина')
          .addStringOption((option) =>
            option
              .setName('message_id')
              .setDescription('ID сообщения для рассылки')
              .setRequired(true),
          )
          .addStringOption((option) =>
            option
              .setName('schedule_time')
              .setDescription(
                'Время отправки (ISO формат, например: 2025-05-07T14:30:00)',
              )
              .setRequired(false),
          ),
        new SlashCommandBuilder()
          .setName('sendall')
          .setDescription('Отправить сообщение всем ополченцам')
          .addStringOption((option) =>
            option
              .setName('message_id')
              .setDescription('ID сообщения для рассылки')
              .setRequired(true),
          )
          .addStringOption((option) =>
            option
              .setName('schedule_time')
              .setDescription(
                'Время отправки (ISO формат, например: 2025-05-07T14:30:00)',
              )
              .setRequired(false),
          ),
      ].map((command) => command.toJSON());

      const rest = new REST({ version: '9' }).setToken(
        this.configService.discordToken,
      );

      this.logger.log('Начало регистрации slash-команд');

      await rest.put(
        Routes.applicationGuildCommands(
          this.configService.discordClientId,
          this.configService.discordGuildId,
        ),
        { body: commands },
      );

      this.logger.log('Slash-команды успешно зарегистрированы');
    } catch (error) {
      this.logger.error('Ошибка при регистрации команд:', error);
    }
  }

  private async getMessageById(messageId: string): Promise<Message | null> {
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
      this.logger.error(
        `Ошибка при поиске сообщения с ID ${messageId}:`,
        error,
      );
      return null;
    }
  }

  // Получение участников с определенной ролью
  private async getMembersByRole(roleName: string): Promise<GuildMember[]> {
    try {
      const guild = this.client.guilds.cache.get(
        this.configService.discordGuildId,
      );
      if (!guild) {
        throw new Error('Сервер не найден');
      }

      // Загружаем всех участников сервера (может потребоваться для больших серверов)
      await guild.members.fetch();

      // Находим роль по имени
      const role = guild.roles.cache.find((r) => r.name === roleName);
      if (!role) {
        throw new Error(`Роль "${roleName}" не найдена на сервере`);
      }

      // Получаем всех участников с этой ролью
      return Array.from(
        guild.members.cache
          .filter((member) => member.roles.cache.has(role.id))
          .values(),
      );
    } catch (error) {
      this.logger.error(
        `Ошибка при получении участников с ролью ${roleName}:`,
        error,
      );
      throw error;
    }
  }

  // Обработка команды отправки сообщения участникам с определенной ролью
  private async handleSendMessage(
    interaction: any,
    messageId: string,
    roleName: string,
    scheduleTime?: string,
  ) {
    try {
      const message = await this.getMessageById(messageId);
      if (!message) {
        await interaction.editReply('Сообщение с указанным ID не найдено.');
        return;
      }

      if (scheduleTime) {
        const scheduledTime = new Date(scheduleTime);
        const now = new Date();

        if (isNaN(scheduledTime.getTime())) {
          await interaction.editReply(
            'Указан неверный формат времени. Используйте формат ISO: YYYY-MM-DDTHH:MM:SS',
          );
          return;
        }

        if (scheduledTime <= now) {
          await interaction.editReply('Время рассылки должно быть в будущем.');
          return;
        }

        const delay = scheduledTime.getTime() - now.getTime();

        // Создаем уникальный ID для запланированной рассылки
        const scheduleId = `${roleName}-${messageId}-${Date.now()}`;

        // Сохраняем таймер для возможности отмены
        const timeout = setTimeout(async () => {
          await this.sendMessageToRole(roleName, message.content);
          this.scheduledMessages.delete(scheduleId);
        }, delay);

        this.scheduledMessages.set(scheduleId, timeout);

        await interaction.editReply(
          `Сообщение будет отправлено участникам с ролью "${roleName}" в ${scheduledTime.toLocaleString()}`,
        );
      } else {
        // Отправляем сразу
        const result = await this.sendMessageToRole(roleName, message.content);
        await interaction.editReply(
          `Сообщение отправлено ${result.success} участникам с ролью "${roleName}". Ошибок: ${result.failed}`,
        );
      }
    } catch (error) {
      this.logger.error('Ошибка при отправке сообщения:', error);
      await interaction.editReply('Произошла ошибка при отправке сообщения.');
    }
  }

  // Обработка команды отправки сообщения всем ополченцам
  private async handleSendAllMessage(
    interaction: any,
    messageId: string,
    scheduleTime?: string,
  ) {
    try {
      const message = await this.getMessageById(messageId);
      if (!message) {
        await interaction.editReply('Сообщение с указанным ID не найдено.');
        return;
      }

      if (scheduleTime) {
        const scheduledTime = new Date(scheduleTime);
        const now = new Date();

        if (isNaN(scheduledTime.getTime())) {
          await interaction.editReply(
            'Указан неверный формат времени. Используйте формат ISO: YYYY-MM-DDTHH:MM:SS',
          );
          return;
        }

        if (scheduledTime <= now) {
          await interaction.editReply('Время рассылки должно быть в будущем.');
          return;
        }

        const delay = scheduledTime.getTime() - now.getTime();

        // Создаем уникальный ID для запланированной рассылки
        const scheduleId = `all-${messageId}-${Date.now()}`;

        // Сохраняем таймер для возможности отмены
        const timeout = setTimeout(async () => {
          await this.sendMessageToAllMilitia(message.content);
          this.scheduledMessages.delete(scheduleId);
        }, delay);

        this.scheduledMessages.set(scheduleId, timeout);

        await interaction.editReply(
          `Сообщение будет отправлено всем ополченцам в ${scheduledTime.toLocaleString()}`,
        );
      } else {
        // Отправляем сразу
        const result = await this.sendMessageToAllMilitia(message.content);
        await interaction.editReply(
          `Сообщение отправлено всем ополченцам: ${result.success} участникам. Ошибок: ${result.failed}`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Ошибка при отправке сообщения всем ополченцам:',
        error,
      );
      await interaction.editReply('Произошла ошибка при отправке сообщения.');
    }
  }

  // Отправка сообщения участникам с определенной ролью
  private async sendMessageToRole(
    roleName: string,
    content: string,
  ): Promise<{ success: number; failed: number }> {
    try {
      const members = await this.getMembersByRole(roleName);
      this.logger.log(
        `Найдено ${members.length} участников с ролью ${roleName}`,
      );

      let success = 0;
      let failed = 0;

      for (const member of members) {
        try {
          await member.send(content);
          success++;

          // Небольшая задержка, чтобы избежать лимитов API Discord
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          this.logger.error(
            `Не удалось отправить сообщение участнику ${member.user.tag}:`,
            error,
          );
          failed++;
        }
      }

      return { success, failed };
    } catch (error) {
      this.logger.error(
        `Ошибка при отправке сообщений участникам с ролью ${roleName}:`,
        error,
      );
      throw error;
    }
  }

  // Отправка сообщения всем ополченцам
  private async sendMessageToAllMilitia(
    content: string,
  ): Promise<{ success: number; failed: number }> {
    try {
      const roleNames = [
        'Ополченец Крейна',
        'Ополченец Гадява',
        'Ополченец Бозевина',
      ];
      const guild = this.client.guilds.cache.get(
        this.configService.discordGuildId,
      );

      if (!guild) {
        throw new Error('Сервер не найден');
      }

      // Загружаем всех участников
      await guild.members.fetch();

      // Находим все нужные роли
      const roles = roleNames
        .map((name) => guild.roles.cache.find((r) => r.name === name))
        .filter((r) => r);

      if (roles.length === 0) {
        throw new Error('Ни одна из ролей ополченцев не найдена');
      }

      // Получаем всех участников с любой из этих ролей (без дубликатов)
      const membersSet = new Set<GuildMember>();

      for (const role of roles) {
        const membersWithRole = guild.members.cache.filter((member) =>
          member.roles.cache.has(role.id),
        );
        membersWithRole.forEach((member) => membersSet.add(member));
      }

      const members = Array.from(membersSet);
      this.logger.log(
        `Найдено ${members.length} уникальных участников с ролями ополченцев`,
      );

      let success = 0;
      let failed = 0;

      for (const member of members) {
        try {
          await member.send(content);
          success++;

          // Небольшая задержка, чтобы избежать лимитов API Discord
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          this.logger.error(
            `Не удалось отправить сообщение участнику ${member.user.tag}:`,
            error,
          );
          failed++;
        }
      }

      return { success, failed };
    } catch (error) {
      this.logger.error(
        'Ошибка при отправке сообщений всем ополченцам:',
        error,
      );
      throw error;
    }
  }

  // Добавленный метод для API
  async sendMessageByRole(
    roleType: 'krein' | 'gadyav' | 'bozevin' | 'all',
    messageDto: SendMessageDto,
  ) {
    try {
      const message = await this.getMessageById(messageDto.messageId);
      if (!message) {
        throw new Error('Сообщение с указанным ID не найдено');
      }

      // Если указано время отправки, планируем отправку
      if (messageDto.scheduleTime) {
        const scheduledTime = new Date(messageDto.scheduleTime);
        const now = new Date();

        if (isNaN(scheduledTime.getTime())) {
          throw new Error(
            'Указан неверный формат времени. Используйте формат ISO: YYYY-MM-DDTHH:MM:SS',
          );
        }

        if (scheduledTime <= now) {
          throw new Error('Время рассылки должно быть в будущем.');
        }

        const delay = scheduledTime.getTime() - now.getTime();

        // Создаем уникальный ID для запланированной рассылки
        const scheduleId = `api-${roleType}-${messageDto.messageId}-${Date.now()}`;

        // Сохраняем таймер для возможности отмены
        let timeout;

        switch (roleType) {
          case 'krein':
            timeout = setTimeout(async () => {
              await this.sendMessageToRole('Ополченец Крейна', message.content);
              this.scheduledMessages.delete(scheduleId);
            }, delay);
            break;
          case 'gadyav':
            timeout = setTimeout(async () => {
              await this.sendMessageToRole('Ополченец Гадява', message.content);
              this.scheduledMessages.delete(scheduleId);
            }, delay);
            break;
          case 'bozevin':
            timeout = setTimeout(async () => {
              await this.sendMessageToRole(
                'Ополченец Бозевина',
                message.content,
              );
              this.scheduledMessages.delete(scheduleId);
            }, delay);
            break;
          case 'all':
            timeout = setTimeout(async () => {
              await this.sendMessageToAllMilitia(message.content);
              this.scheduledMessages.delete(scheduleId);
            }, delay);
            break;
        }

        this.scheduledMessages.set(scheduleId, timeout);

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
            result = await this.sendMessageToRole(
              'Ополченец Крейна',
              message.content,
            );
            break;
          case 'gadyav':
            result = await this.sendMessageToRole(
              'Ополченец Гадява',
              message.content,
            );
            break;
          case 'bozevin':
            result = await this.sendMessageToRole(
              'Ополченец Бозевина',
              message.content,
            );
            break;
          case 'all':
            result = await this.sendMessageToAllMilitia(message.content);
            break;
        }

        return {
          success: true,
          sent: result.success,
          failed: result.failed,
        };
      }
    } catch (error) {
      this.logger.error('Ошибка при отправке сообщения через API:', error);
      throw error;
    }
  }
}
