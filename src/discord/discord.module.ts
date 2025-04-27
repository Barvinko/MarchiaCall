import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DiscordService } from './discord.service';
import { DiscordController } from './discord.controller';
import { Subscriber, SubscriberSchema } from './schemas/subscriber.schema';
import { ConfigService } from '../config/config.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subscriber.name, schema: SubscriberSchema },
    ]),
  ],
  controllers: [DiscordController],
  providers: [DiscordService, ConfigService],
})
export class DiscordModule {}