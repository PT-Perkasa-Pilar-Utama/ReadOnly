export interface ClockPort {
  now(): Date;
  utcNow(): Date;
}

export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }

  utcNow(): Date {
    return new Date();
  }
}
