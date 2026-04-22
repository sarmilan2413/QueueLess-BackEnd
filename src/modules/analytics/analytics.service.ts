import { Injectable } from '@nestjs/common';
import { BookingsService } from '../bookings/bookings.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly bookingsService: BookingsService) {}

  getSummary() {
    return this.bookingsService.getSummaryStats();
  }

  getHourly() {
    return this.bookingsService.getHourlyStats();
  }
}
