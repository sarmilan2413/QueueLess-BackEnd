import { Module } from '@nestjs/common';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { QueueModule } from './modules/queue/queue.module';

@Module({
  imports: [
    BookingsModule,
    QueueModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
