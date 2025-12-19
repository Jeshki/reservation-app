import dayjs from 'dayjs';

// Returns an inclusive YYYY-MM-DD list between two valid dates.
export function generateDates(start?: string, end?: string) {
  if (!start || !end) return [];

  const startDate = dayjs(start);
  const endDate = dayjs(end);
  if (!startDate.isValid() || !endDate.isValid() || startDate.isAfter(endDate, 'day')) {
    return [];
  }

  const dates = [];
  let cursor = startDate;
  while (!cursor.isAfter(endDate, 'day')) {
    dates.push(cursor.format('YYYY-MM-DD'));
    cursor = cursor.add(1, 'day');
  }

  return dates;
}
