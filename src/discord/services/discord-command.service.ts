import { Injectable, Logger } from '@nestjs/common';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { SlashCommandBuilder } from '@discordjs/builders';
import { ConfigService } from '../../config/config.service';
import { Client } from 'discord.js';
import { DiscordMessageService } from './discord-message.service';
import { DiscordSchedulerService } from './discord-scheduler.service';
import { MilitiaRoleNames } from '../interfaces/discord.interfaces';

@Injectable()
export class DiscordCommandService {
  private readonly logger = new Logger(DiscordCommandService.name);

  constructor(
    private configService: ConfigService,
    private messageService: DiscordMessageService,
    private schedulerService: DiscordSchedulerService,
  ) {}

  async registerCommands(client: Client) {
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

  async handleInteraction(interaction: any) {
    if (!interaction.isCommand()) return;

    try {
      const { commandName } = interaction;
      const messageId = interaction.options.get('message_id')?.value as string;
      const scheduleTime = interaction.options.get('schedule_time')
        ?.value as string;

      await interaction.deferReply({ ephemeral: true });

      switch (commandName) {
        case 'sendkrein':
          await this.handleSendMessage(
            interaction,
            messageId,
            MilitiaRoleNames.KREIN,
            scheduleTime,
          );
          break;
        case 'sendgadyav':
          await this.handleSendMessage(
            interaction,
            messageId,
            MilitiaRoleNames.GADYAV,
            scheduleTime,
          );
          break;
        case 'sendbozevin':
          await this.handleSendMessage(
            interaction,
            messageId,
            MilitiaRoleNames.BOZEVIN,
            scheduleTime,
          );
          break;
        case 'sendall':
          await this.handleSendAllMessage(interaction, messageId, scheduleTime);
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
  }

  private async handleSendMessage(
    interaction: any,
    messageId: string,
    roleName: string,
    scheduleTime?: string,
  ) {
    try {
      const message = await this.messageService.getMessageById(messageId);
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

        // Планируем отправку
        const scheduleId = this.schedulerService.scheduleMessageToRole(
          roleName,
          message.content,
          scheduledTime,
          messageId,
        );

        await interaction.editReply(
          `Сообщение будет отправлено участникам с ролью "${roleName}" в ${scheduledTime.toLocaleString()}`,
        );
      } else {
        // Отправляем сразу
        const result = await this.messageService.sendMessageToRole(
          roleName,
          message.content,
        );
        await interaction.editReply(
          `Сообщение отправлено ${result.success} участникам с ролью "${roleName}". Ошибок: ${result.failed}`,
        );
      }
    } catch (error) {
      this.logger.error('Ошибка при отправке сообщения:', error);
      await interaction.editReply('Произошла ошибка при отправке сообщения.');
    }
  }

  private async handleSendAllMessage(
    interaction: any,
    messageId: string,
    scheduleTime?: string,
  ) {
    try {
      const message = await this.messageService.getMessageById(messageId);
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

        // Планируем отправку всем
        const scheduleId = this.schedulerService.scheduleMessageToAllMilitia(
          message.content,
          scheduledTime,
          messageId,
        );

        await interaction.editReply(
          `Сообщение будет отправлено всем ополченцам в ${scheduledTime.toLocaleString()}`,
        );
      } else {
        // Отправляем сразу
        const result = await this.messageService.sendMessageToAllMilitia(
          message.content,
        );
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
}
