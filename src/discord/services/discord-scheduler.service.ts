import { Injectable, Logger } from '@nestjs/common';
import { DiscordMessageService } from './discord-message.service';
import { ScheduledMessageInfo } from '../interfaces/discord.interfaces';

@Injectable()
export class DiscordSchedulerService {
  private readonly logger = new Logger(DiscordSchedulerService.name);
  private scheduledMessages: Map<string, NodeJS.Timeout> = new Map();
  private messageService: DiscordMessageService;

  setMessageService(service: DiscordMessageService) {
    this.messageService = service;
  }

  scheduleMessageToRole(roleName: string, content: string, scheduledTime: Date, messageId: string): string {
    const now = new Date();
    const delay = scheduledTime.getTime() - now.getTime();
    
    // Создаем уникальный ID для запланированной рассылки
    const scheduleId = `${roleName}-${messageId}-${Date.now()}`;
    
    // Сохраняем таймер для возможности отмены
    const timeout = setTimeout(async () => {
      await this.messageService.sendMessageToRole(roleName, content);
      this.scheduledMessages.delete(scheduleId);
    }, delay);
    
    this.scheduledMessages.set(scheduleId, timeout);
    
    this.logger.log(`Запланирована отправка сообщения для роли "${roleName}" в ${scheduledTime.toLocaleString()}`);
    
    return scheduleId;
  }

  scheduleMessageToAllMilitia(content: string, scheduledTime: Date, messageId: string): string {
    const now = new Date();
    const delay = scheduledTime.getTime() - now.getTime();
    
    // Создаем уникальный ID для запланированной рассылки
    const scheduleId = `all-${messageId}-${Date.now()}`;
    
    // Сохраняем таймер для возможности отмены
    const timeout = setTimeout(async () => {
      await this.messageService.sendMessageToAllMilitia(content);
      this.scheduledMessages.delete(scheduleId);
    }, delay);
    
    this.scheduledMessages.set(scheduleId, timeout);
    
    this.logger.log(`Запланирована отправка сообщения всем ополченцам в ${scheduledTime.toLocaleString()}`);
    
    return scheduleId;
  }

  cancelScheduledMessage(scheduleId: string): boolean {
    const timeout = this.scheduledMessages.get(scheduleId);
    if (timeout) {
      clearTimeout(timeout);
      this.scheduledMessages.delete(scheduleId);
      this.logger.log(`Отменена запланированная отправка сообщения с ID ${scheduleId}`);
      return true;
    }
    return false;
  }

  getScheduledMessages(): ScheduledMessageInfo[] {
    // В реальном приложении здесь можно было бы возвращать информацию
    // о запланированных сообщениях, если это необходимо
    return [];
  }
}