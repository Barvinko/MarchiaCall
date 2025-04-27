import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get discordToken(): string {
    return this.configService.get<string>('DISCORD_TOKEN');
  }

  get discordClientId(): string {
    return this.configService.get<string>('DISCORD_CLIENT_ID');
  }
}