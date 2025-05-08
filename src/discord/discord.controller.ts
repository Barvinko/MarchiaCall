import { Controller, Post, Body, Param } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { SendMessageDto } from './dto/message.dto';

@Controller('discord')
export class DiscordController {
  constructor(private readonly discordService: DiscordService) {}

  @Post('send/:roleType')
  async sendMessage(
    @Param('roleType') roleType: 'krein' | 'gadyav' | 'bozevin' | 'all',
    @Body() messageDto: SendMessageDto,
  ) {
    return this.discordService.sendMessageByRole(roleType, messageDto);
  }
}
