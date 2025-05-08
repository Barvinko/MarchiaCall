import { GuildMember } from 'discord.js';

export interface MessageSendResult {
  success: number;
  failed: number;
}

export interface ScheduledMessageInfo {
  id: string;
  roleType: string;
  messageId: string;
  scheduleTime: Date;
  content?: string;
}

export interface ApiSendResult {
  success: boolean;
  scheduled?: boolean;
  scheduleTime?: string;
  sent?: number;
  failed?: number;
}

export enum MilitiaRoleNames {
  KREIN = 'Ополченец Крейна',
  GADYAV = 'Ополченец Гадява',
  BOZEVIN = 'Ополченец Бозевина',
}