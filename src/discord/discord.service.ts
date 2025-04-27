import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import {
  Client,
  GatewayIntentBits,
  TextChannel,
  MessageCreateOptions,
} from 'discord.js';
import { Subscriber, SubscriberDocument } from './schemas/subscriber.schema';
import { CreateSubscriberDto, MessageDto } from './dto/subscriber.dto';
import { ConfigService } from '../config/config.service';

@Injectable()
export class DiscordService implements OnModuleInit {
  private client: Client;

  constructor(
    @InjectModel(Subscriber.name)
    private subscriberModel: Model<SubscriberDocument>,
    private configService: ConfigService,
  ) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
      ],
    });
  }

  async onModuleInit() {
    this.client.on('ready', () => {
      console.log(`Бот авторизован как ${this.client.user.tag}`);
      console.log(`ID бота: ${this.client.user.id}`);
      console.log('Настроенные интенты:');
      console.log(this.client.options.intents);

      const users = this.client.users.cache.size;
      console.log(`Доступно пользователей: ${users}`);

      // Проверка доступа к серверам
      const guilds = this.client.guilds.cache.size;
      console.log(`Доступно серверов: ${guilds}`);

      // Если есть серверы, проверим каналы
      if (guilds > 0) {
        const firstGuild = this.client.guilds.cache.first();
        console.log(`Имя сервера: ${firstGuild.name}`);
        console.log(`Каналы: ${firstGuild.channels.cache.size}`);
      }
    });

    this.client.on('messageCreate', async (message) => {
      console.log(
        `Получено сообщение: ${message.content} от ${message.author.username}`,
      );
      if (message.author.bot) return;

      if (message.content === '!subscribe') {
        await this.addSubscriber({
          userId: message.author.id,
          username: message.author.username,
        });
        await message.reply(
          `${message.author.username} успешно подписан на рассылку.`,
        );
      }

      if (message.content === '!unsubscribe') {
        const answerUnsubscribe = await this.unsubscribe(
          message.author.username,
        );
        await message.reply(
          answerUnsubscribe
            ? `${message.author.username} отписан от рассылки.`
            : `${message.author.username} не был подписан.`,
        );
      }
    });

    await this.client.login(this.configService.discordToken);
  }

  async addSubscriber(
    createSubscriberDto: CreateSubscriberDto,
  ): Promise<Subscriber> {
    const existingSubscriber = await this.subscriberModel.findOne({
      userId: createSubscriberDto.userId,
    });

    if (existingSubscriber) {
      if (!existingSubscriber.isActive) {
        existingSubscriber.isActive = true;
        return existingSubscriber.save();
      }
      return existingSubscriber;
    }

    const newSubscriber = new this.subscriberModel(createSubscriberDto);
    return newSubscriber.save();
  }

  async unsubscribe(username: string): Promise<boolean> {
    const deleteSubscriber = await this.subscriberModel.deleteOne({
      username: username,
    });
    return Boolean(deleteSubscriber.deletedCount);
  }

  async getSubscribers(): Promise<Subscriber[]> {
    return this.subscriberModel.find({ isActive: true }).exec();
  }

  async sendDirectMessage(messageDto: MessageDto): Promise<void> {
    const activeSubscribers = await this.getSubscribers();

    for (const subscriber of activeSubscribers) {
      try {
        const user = await this.client.users.fetch(subscriber.userId);
        if (user) {
          await user.send(messageDto.content);
          console.log(
            `Сообщение отправлено пользователю ${subscriber.username}`,
          );
        }
      } catch (error) {
        console.error(
          `Не удалось отправить сообщение пользователю ${subscriber.username}:`,
          error,
        );
      }
    }
  }
}
