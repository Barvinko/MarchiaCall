import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { DiscordController } from './discord.controller';
import { ConfigService } from '../config/config.service';

@Module({
  controllers: [DiscordController],
  providers: [DiscordService, ConfigService],
})
export class DiscordModule {}
