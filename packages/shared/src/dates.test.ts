import { describe, expect, it } from 'bun:test';
import {
  addDaysToWibDateString,
  calculateDueDateWib,
  calculateNextWibRunDelayMs,
  formatIndonesianDate,
  getWibDate,
  getWibDateString,
  getWibDaysDifference,
  isSameWibDay,
} from './dates';

describe('shared dates utilities (WIB)', () => {
  it('correctly shifts UTC dates to WIB date string', () => {
    // 2026-11-08 17:00:00 UTC is 2026-11-09 00:00:00 WIB
    const d1 = new Date('2026-11-08T17:00:00.000Z');
    expect(getWibDate(d1).getUTCDate()).toBe(9);
    expect(getWibDateString(d1)).toBe('2026-11-09');

    // 2026-11-08 16:59:59 UTC is 2026-11-08 23:59:59 WIB
    const d2 = new Date('2026-11-08T16:59:59.000Z');
    expect(getWibDateString(d2)).toBe('2026-11-08');
  });

  it('calculates calendar day differences in WIB correctly', () => {
    expect(getWibDaysDifference('2026-11-08', '2026-11-09')).toBe(1);
    expect(getWibDaysDifference('2026-11-08', '2026-11-08')).toBe(0);
    expect(getWibDaysDifference('2026-11-08', '2026-11-12')).toBe(4);
    expect(getWibDaysDifference('2026-11-08', '2026-11-13')).toBe(5);
    expect(getWibDaysDifference('2026-11-09', '2026-11-08')).toBe(-1);
  });

  it('formats dates into Indonesian format verbatim (Q-36)', () => {
    expect(formatIndonesianDate('2026-11-08')).toBe('8 November 2026');
    expect(formatIndonesianDate('2026-01-01')).toBe('1 Januari 2026');
    expect(formatIndonesianDate('2026-05-15T12:00:00Z')).toBe('15 Mei 2026');
  });

  it('determines if two timestamps fall on the same WIB calendar day', () => {
    const earlyMorningWib = new Date('2026-11-08T18:00:00Z'); // 01:00 WIB Nov 9
    const lateNightWib = new Date('2026-11-09T16:00:00Z'); // 23:00 WIB Nov 9
    const nextDayWib = new Date('2026-11-09T17:01:00Z'); // 00:01 WIB Nov 10

    expect(isSameWibDay(earlyMorningWib, lateNightWib)).toBe(true);
    expect(isSameWibDay(lateNightWib, nextDayWib)).toBe(false);
  });

  it('calculates due date in WIB correctly based on confirmation timestamp', () => {
    // 2026-11-01 10:00 WIB (03:00 UTC) + 7 days -> 2026-11-08
    const confirmed1 = new Date('2026-11-01T03:00:00.000Z');
    expect(calculateDueDateWib(confirmed1, 7)).toBe('2026-11-08');

    // 2026-11-09 10:00 WIB (03:00 UTC) + 7 days -> 2026-11-16
    const confirmed2 = new Date('2026-11-09T03:00:00.000Z');
    expect(calculateDueDateWib(confirmed2, 7)).toBe('2026-11-16');

    // Late night UTC that crosses to next WIB calendar day:
    // 2026-11-09 23:00:00 UTC = 2026-11-10 06:00:00 WIB -> + 7 days = 2026-11-17
    const confirmed3 = new Date('2026-11-09T23:00:00.000Z');
    expect(calculateDueDateWib(confirmed3, 7)).toBe('2026-11-17');
  });

  it('calculates next 00:05 WIB delay accurately', () => {
    // 00:02 WIB Nov 9 -> 3 minutes (180,000 ms) until 00:05 WIB Nov 9
    const before0005 = new Date('2026-11-08T17:02:00.000Z'); // 00:02 WIB
    expect(calculateNextWibRunDelayMs(before0005, 0, 5)).toBe(3 * 60 * 1000);

    // 00:05 WIB Nov 9 -> 24 hours (86,400,000 ms) until 00:05 WIB Nov 10
    const at0005 = new Date('2026-11-08T17:05:00.000Z'); // 00:05 WIB
    expect(calculateNextWibRunDelayMs(at0005, 0, 5)).toBe(24 * 60 * 60 * 1000);

    // 10:35 WIB Nov 9 -> 13 hours and 30 minutes until 00:05 WIB Nov 10
    const midday = new Date('2026-11-09T03:35:00.000Z'); // 10:35 WIB
    const expectedDelay = (13 * 60 + 30) * 60 * 1000;
    expect(calculateNextWibRunDelayMs(midday, 0, 5)).toBe(expectedDelay);
  });

  it('adds calendar days to WIB date string correctly', () => {
    expect(addDaysToWibDateString('2026-11-13', 3)).toBe('2026-11-16');
    expect(addDaysToWibDateString('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDaysToWibDateString('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToWibDateString('2026-11-16', -3)).toBe('2026-11-13');
  });
});
