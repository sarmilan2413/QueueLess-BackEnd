import { Injectable } from '@nestjs/common';
import { IsEnum } from 'class-validator';
import { BookingsService } from '../bookings/bookings.service';
import {
  BOOKING_STATUSES,
  BookingStatus,
} from '../bookings/schemas/booking.schema';

export class UpdateQueueStatusDto {
  @IsEnum(BOOKING_STATUSES)
  status!: BookingStatus;
}

@Injectable()
export class QueueService {
  constructor(private readonly bookingsService: BookingsService) {}

  getQueueStatus(bookingId: string) {
    return this.bookingsService.getQueueStatus(bookingId);
  }

  getLiveQueueOverview() {
    return this.bookingsService.getLiveQueueOverview();
  }

  updateStatus(id: string, status: BookingStatus) {
    return this.bookingsService.updateStatus(id, status);
  }
}
