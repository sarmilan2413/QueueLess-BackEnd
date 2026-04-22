import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking, BookingStatus } from './schemas/booking.schema';

type QueueComputation = {
  currentServingToken: string | null;
  waitingCount: number;
  servingCount: number;
  totalActive: number;
};

type SummaryStats = {
  totalBookings: number;
  waiting: number;
  serving: number;
  completed: number;
  cancelled: number;
};

type StoredBooking = Booking & {
  _id: string;
};

@Injectable()
export class BookingsService {
  private readonly averageServiceTime = 15;
  private readonly bookings: StoredBooking[] = [];

  async create(createBookingDto: CreateBookingDto) {
    const booking: StoredBooking = {
      _id: new Types.ObjectId().toHexString(),
      customerName: createBookingDto.customerName,
      email: createBookingDto.email,
      serviceType: createBookingDto.serviceType,
      appointmentDate: createBookingDto.appointmentDate,
      appointmentTime: createBookingDto.appointmentTime,
      status: createBookingDto.status ?? 'waiting',
      tokenNumber: await this.generateNextToken(),
      queuePosition: 0,
      estimatedWait: 0,
      createdAt: new Date(),
    };

    this.bookings.unshift(booking);

    await this.recalculateQueueMetrics();

    const createdBooking = await this.findByIdOrThrow(booking._id);

    return {
      message: 'Booking created successfully',
      data: createdBooking,
    };
  }

  async findAll() {
    const bookings = this.bookings
      .slice()
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((booking) => this.cloneBooking(booking));

    return {
      message: 'Bookings fetched successfully',
      data: bookings,
    };
  }

  async findOne(id: string) {
    const booking = await this.findByIdOrThrow(id);

    return {
      message: 'Booking fetched successfully',
      data: booking,
    };
  }

  async update(id: string, updateBookingDto: UpdateBookingDto) {
    this.ensureValidObjectId(id);

    const booking = this.findBookingById(id);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    Object.assign(booking, updateBookingDto);

    await this.recalculateQueueMetrics();
    const updatedBooking = await this.findByIdOrThrow(id);

    return {
      message: 'Booking updated successfully',
      data: updatedBooking,
    };
  }

  async remove(id: string) {
    this.ensureValidObjectId(id);

    const bookingIndex = this.bookings.findIndex((entry) => entry._id === id);

    if (bookingIndex < 0) {
      throw new NotFoundException('Booking not found');
    }

    const [booking] = this.bookings.splice(bookingIndex, 1);

    await this.recalculateQueueMetrics();

    return {
      message: 'Booking deleted successfully',
      data: this.cloneBooking(booking),
    };
  }

  async updateStatus(id: string, status: BookingStatus) {
    return this.update(id, { status });
  }

  async getQueueStatus(bookingId: string) {
    const booking = await this.findByIdOrThrow(bookingId);
    const queueSummary = await this.getQueueOverviewData();

    return {
      message: 'Queue status fetched successfully',
      data: {
        booking,
        currentServingToken: queueSummary.currentServingToken,
        averageServiceTime: this.averageServiceTime,
      },
    };
  }

  async getQueueOverviewData() {
    return this.recalculateQueueMetrics(false);
  }

  async getLiveQueueOverview() {
    const queueSummary = await this.getQueueOverviewData();
    const activeBookings = this.bookings
      .filter((booking) => booking.status === 'waiting' || booking.status === 'serving')
      .sort((left, right) => {
        if (left.queuePosition !== right.queuePosition) {
          return left.queuePosition - right.queuePosition;
        }

        return left.createdAt.getTime() - right.createdAt.getTime();
      })
      .map((booking) => this.cloneBooking(booking));

    return {
      message: 'Live queue overview fetched successfully',
      data: {
        ...queueSummary,
        averageServiceTime: this.averageServiceTime,
        bookings: activeBookings,
      },
    };
  }

  async getSummaryStats() {
    const summary: SummaryStats = {
      totalBookings: 0,
      waiting: 0,
      serving: 0,
      completed: 0,
      cancelled: 0,
    };

    this.bookings.forEach((booking) => {
      summary.totalBookings += 1;
      summary[booking.status] += 1;
    });

    return {
      message: 'Analytics summary fetched successfully',
      data: summary,
    };
  }

  async getHourlyStats() {
    const hourlyMap = new Map<number, number>();

    this.bookings.forEach((booking) => {
      const hour = booking.createdAt.getHours();
      hourlyMap.set(hour, (hourlyMap.get(hour) ?? 0) + 1);
    });

    return {
      message: 'Hourly analytics fetched successfully',
      data: Array.from(hourlyMap.entries())
        .sort(([leftHour], [rightHour]) => leftHour - rightHour)
        .map(([hour, totalBookings]) => ({
          hour,
          totalBookings,
        })),
    };
  }

  private async generateNextToken() {
    const latestBooking = this.bookings.reduce<StoredBooking | null>(
      (latest, booking) => {
        if (!latest) {
          return booking;
        }

        return booking.createdAt > latest.createdAt ? booking : latest;
      },
      null,
    );

    const currentNumber = latestBooking?.tokenNumber
      ? Number.parseInt(latestBooking.tokenNumber.split('-')[1], 10)
      : 0;

    return `A-${String(currentNumber + 1).padStart(2, '0')}`;
  }

  private async recalculateQueueMetrics(shouldPersist = true): Promise<QueueComputation> {
    const activeBookings = this.bookings
      .filter((booking) => booking.status === 'waiting' || booking.status === 'serving')
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());

    const servingBookings = activeBookings.filter(
      (booking) => booking.status === 'serving',
    );
    const waitingBookings = activeBookings.filter(
      (booking) => booking.status === 'waiting',
    );
    const currentServingToken = servingBookings[0]?.tokenNumber ?? null;

    const orderedBookings = [...servingBookings, ...waitingBookings];

    orderedBookings.forEach((booking, index) => {
      booking.queuePosition = index + 1;
      booking.estimatedWait =
        booking.status === 'serving' ? 0 : index * this.averageServiceTime;
    });

    if (shouldPersist) {
      this.bookings
        .filter((booking) => booking.status === 'completed' || booking.status === 'cancelled')
        .forEach((booking) => {
          booking.queuePosition = 0;
          booking.estimatedWait = 0;
        });
    }

    return {
      currentServingToken,
      waitingCount: waitingBookings.length,
      servingCount: servingBookings.length,
      totalActive: activeBookings.length,
    };
  }

  private async findByIdOrThrow(id: string) {
    this.ensureValidObjectId(id);

    const booking = this.findBookingById(id);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return this.cloneBooking(booking);
  }

  private findBookingById(id: string) {
    return this.bookings.find((booking) => booking._id === id) ?? null;
  }

  private cloneBooking(booking: StoredBooking) {
    return { ...booking };
  }

  private ensureValidObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid booking ID');
    }
  }
}
