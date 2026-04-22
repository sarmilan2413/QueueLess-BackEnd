import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { QueueService, UpdateQueueStatusDto } from './queue.service';

@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get('live')
  getLiveQueueOverview() {
    return this.queueService.getLiveQueueOverview();
  }

  @Get(':bookingId')
  getQueueStatus(@Param('bookingId') bookingId: string) {
    return this.queueService.getQueueStatus(bookingId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateQueueStatusDto: UpdateQueueStatusDto,
  ) {
    return this.queueService.updateStatus(id, updateQueueStatusDto.status);
  }
}
