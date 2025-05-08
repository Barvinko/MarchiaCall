import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { DiscordCommandService } from './services/discord-command.service';
import { DiscordMessageService } from './services/discord-message.service';
import { DiscordSchedulerService } from './services/discord-scheduler.service';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule],
  providers: [
    DiscordService,
    DiscordCommandService,
    DiscordMessageService,
    DiscordSchedulerService,
  ],
  exports: [DiscordService],
})
export class DiscordModule {}
