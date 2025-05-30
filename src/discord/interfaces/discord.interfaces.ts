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

export enum MilitiaRoleNames {
  KREIN = 'Ополченец Крейна',
  GADYAV = 'Ополченец Гадява',
  BOZEVIN = 'Ополченец Бозевина',
}
