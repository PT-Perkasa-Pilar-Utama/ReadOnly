const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

export function getWibDate(date: Date): Date {
  return new Date(date.getTime() + WIB_OFFSET_MS);
}

export function getWibDateString(date: Date): string {
  const wibTime = getWibDate(date);
  return wibTime.toISOString().slice(0, 10);
}

export function getWibDaysDifference(
  dueDateStr: string,
  todayWibStr: string,
): number {
  const dueUtc = Date.parse(`${dueDateStr}T00:00:00Z`);
  const todayUtc = Date.parse(`${todayWibStr}T00:00:00Z`);
  return Math.floor((todayUtc - dueUtc) / DAY_MS);
}

export function formatIndonesianDate(isoDateString: string): string {
  const cleanDate = isoDateString.slice(0, 10);
  const [yearStr, monthStr, dayStr] = cleanDate.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const monthName = INDONESIAN_MONTHS[(month || 1) - 1] ?? 'Januari';
  return `${day} ${monthName} ${year}`;
}

export function isSameWibDay(dateA: Date, dateB: Date): boolean {
  return getWibDateString(dateA) === getWibDateString(dateB);
}

export function calculateNextWibRunDelayMs(
  now: Date,
  targetHour = 0,
  targetMinute = 5,
): number {
  const wibTime = getWibDate(now);
  const wibHours = wibTime.getUTCHours();
  const wibMinutes = wibTime.getUTCMinutes();
  const wibSeconds = wibTime.getUTCSeconds();
  const wibMs = wibTime.getUTCMilliseconds();

  const msSinceMidnight =
    (wibHours * 3600 + wibMinutes * 60 + wibSeconds) * 1000 + wibMs;
  const targetMsFromMidnight = (targetHour * 3600 + targetMinute * 60) * 1000;

  if (msSinceMidnight < targetMsFromMidnight) {
    return targetMsFromMidnight - msSinceMidnight;
  }

  return DAY_MS - msSinceMidnight + targetMsFromMidnight;
}
