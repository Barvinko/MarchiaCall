import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { CreateSubscriberDto, MessageDto } from './dto/subscriber.dto';
import { Subscriber } from './schemas/subscriber.schema';

@Controller('discord')
export class DiscordController {
  constructor(private readonly discordService: DiscordService) {}

  @Post('subscribe')
  async addSubscriber(
    @Body() createSubscriberDto: CreateSubscriberDto,
  ): Promise<Subscriber> {
    return this.discordService.addSubscriber(createSubscriberDto);
  }

  @Delete('unsubscribe/:userId')
  async unsubscribe(@Param('userId') userId: string): Promise<boolean> {
    return this.discordService.unsubscribe(userId);
  }

  @Get('subscribers')
  async getSubscribers(): Promise<Subscriber[]> {
    return this.discordService.getSubscribers();
  }

  @Post('send-message')
  async sendMessage(
    @Body() messageDto: MessageDto,
  ): Promise<{ success: boolean }> {
    await this.discordService.sendDirectMessage(messageDto);
    return { success: true };
  }
}
