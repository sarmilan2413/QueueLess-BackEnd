import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  BOOKING_STATUSES,
  BookingStatus,
} from '../schemas/booking.schema';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  serviceType!: string;

  @Type(() => Date)
  @IsDate()
  appointmentDate!: Date;

  @IsString()
  @IsNotEmpty()
  appointmentTime!: string;

  @IsOptional()
  @IsEnum(BOOKING_STATUSES)
  status?: BookingStatus;
}
