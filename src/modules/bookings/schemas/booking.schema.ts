import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const BOOKING_STATUSES = [
  'waiting',
  'serving',
  'completed',
  'cancelled',
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export type BookingDocument = HydratedDocument<Booking>;

@Schema({
  versionKey: false,
  timestamps: { createdAt: true, updatedAt: false },
})
export class Booking {
  @Prop({ required: true, trim: true })
  customerName!: string;

  @Prop({ required: true, trim: true, lowercase: true })
  email!: string;

  @Prop({ required: true, trim: true })
  serviceType!: string;

  @Prop({ required: true })
  appointmentDate!: Date;

  @Prop({ required: true, trim: true })
  appointmentTime!: string;

  @Prop({
    type: String,
    enum: BOOKING_STATUSES,
    default: 'waiting',
  })
  status!: BookingStatus;

  @Prop({ required: true, unique: true, trim: true })
  tokenNumber!: string;

  @Prop({ required: true, default: 0 })
  queuePosition!: number;

  @Prop({ required: true, default: 0 })
  estimatedWait!: number;

  createdAt!: Date;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
