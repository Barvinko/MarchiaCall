export enum RoleType {
  KREIN = 'krein',
  GADYAV = 'gadyav',
  BOZEVIN = 'bozevin',
  ALL = 'all',
}

export class SendMessageDto {
  messageId: string;
  scheduleTime?: string;
}