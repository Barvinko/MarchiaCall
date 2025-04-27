import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubscriberDocument = Subscriber & Document;

@Schema()
export class Subscriber {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  username: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: Date.now })
  subscribedAt: Date;
}

export const SubscriberSchema = SchemaFactory.createForClass(Subscriber);