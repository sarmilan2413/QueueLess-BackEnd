import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';

@Module({
  imports: [BookingsModule],
  controllers: [QueueController],
  providers: [QueueService],
})
export class QueueModule {}
