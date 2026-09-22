import { describe, test, expect } from 'bun:test';
import { CronParser } from './cron/cron-parser';
import { Cron, Interval, Timeout, SCHEDULE_CRON_METADATA, SCHEDULE_INTERVAL_METADATA, SCHEDULE_TIMEOUT_METADATA } from './decorators/schedule.decorators';

describe('CronParser.parse', () => {
  test('parses 5-field expression (no seconds)', () => {
    const c = CronParser.parse('0 12 * * *');
    expect(c).toEqual({ second: '0', minute: '0', hour: '12', dayOfMonth: '*', month: '*', dayOfWeek: '*' });
  });

  test('parses 6-field expression with seconds', () => {
    const c = CronParser.parse('30 0 12 * * *');
    expect(c.second).toBe('30');
    expect(c.minute).toBe('0');
    expect(c.hour).toBe('12');
  });

  test('rejects malformed expressions', () => {
    expect(() => CronParser.parse('not a cron')).toThrow(/Invalid cron expression/);
    expect(() => CronParser.parse('* * *')).toThrow(/Invalid cron expression/);
    expect(() => CronParser.parse('')).toThrow(/Invalid cron expression/);
  });
});

describe('CronParser field matching', () => {
  const d = (year: number, month: number, day: number, hour = 0, minute = 0, second = 0) =>
    new Date(year, month - 1, day, hour, minute, second);

  test('exact minute/hour match', () => {
    expect(CronParser.matches(CronParser.parse('0 30 14 * * *'), d(2026, 9, 21, 14, 30, 0))).toBe(true);
    expect(CronParser.matches(CronParser.parse('0 30 14 * * *'), d(2026, 9, 21, 14, 31, 0))).toBe(false);
  });

  test('wildcard matches everything', () => {
    expect(CronParser.matches(CronParser.parse('0 0 0 * * *'), d(2026, 1, 1))).toBe(true);
  });

  test('ranges', () => {
    const cron = CronParser.parse('0 30 8-17 * * *');
    expect(CronParser.matches(cron, d(2026, 9, 21, 8, 30))).toBe(true);
    expect(CronParser.matches(cron, d(2026, 9, 21, 17, 30))).toBe(true);
    expect(CronParser.matches(cron, d(2026, 9, 21, 7, 30))).toBe(false);
    expect(CronParser.matches(cron, d(2026, 9, 21, 18, 30))).toBe(false);
  });

  test('lists', () => {
    const cron = CronParser.parse('0 0 0 * * 1,3,5');
    expect(CronParser.matches(cron, d(2026, 9, 21))).toBe(true); // Monday
    expect(CronParser.matches(cron, d(2026, 9, 23))).toBe(true); // Wednesday
    expect(CronParser.matches(cron, d(2026, 9, 22))).toBe(false); // Tuesday
  });

  test('steps', () => {
    const cron = CronParser.parse('*/15 * * * * *');
    expect(CronParser.matches(cron, d(2026, 9, 21, 10, 0, 0))).toBe(true);
    expect(CronParser.matches(cron, d(2026, 9, 21, 10, 0, 15))).toBe(true);
    expect(CronParser.matches(cron, d(2026, 9, 21, 10, 0, 10))).toBe(false);
  });

  test('step over explicit range', () => {
    const cron = CronParser.parse('0 30 8-17/4 * * *');
    expect(CronParser.matches(cron, d(2026, 9, 21, 8, 30))).toBe(true);
    expect(CronParser.matches(cron, d(2026, 9, 21, 12, 30))).toBe(true);
    expect(CronParser.matches(cron, d(2026, 9, 21, 9, 30))).toBe(false);
  });

  test('getNextRun finds next minute boundary for every-minute cron', () => {
    const from = new Date(2026, 8, 21, 10, 15, 30);
    const next = CronParser.getNextRun('* * * * *', from);
    expect(next.getMinutes()).toBe(16);
    expect(next.getSeconds()).toBe(0);
  });

  test('next specific time rolls to tomorrow when passed', () => {
    const from = new Date(2026, 8, 21, 14, 30, 5);
    const next = CronParser.getNextRun('0 30 14 * * *', from);
    expect(next.getDate()).toBe(22);
    expect(next.getHours()).toBe(14);
    expect(next.getMinutes()).toBe(30);
  });

  test('rolls across month boundaries', () => {
    const from = new Date(2026, 8, 30, 23, 59, 5);
    const next = CronParser.getNextRun('0 0 0 1 10 *', from);
    expect(next.getMonth()).toBe(9);
    expect(next.getDate()).toBe(1);
  });

  test('rolls across year boundaries', () => {
    const from = new Date(2026, 11, 31, 23, 59, 5);
    const next = CronParser.getNextRun('0 0 0 1 1 *', from);
    expect(next.getFullYear()).toBe(2027);
    expect(next.getMonth()).toBe(0);
    expect(next.getDate()).toBe(1);
  });

  test('dayOfWeek constraint is honored', () => {
    const from = new Date(2026, 8, 21, 12, 0, 0); // Monday
    const next = CronParser.getNextRun('0 0 12 * * 0', from); // Sunday only
    expect(next.getDay()).toBe(0);
    expect(next.getTime()).toBeGreaterThan(from.getTime());
  });
});

describe('schedule decorators', () => {
  class Tasks {
    @Cron('0 0 12 * * *')
    cronTask() {}

    @Interval(5000)
    intervalTask() {}

    @Timeout(10000)
    timeoutTask() {}
  }

  test('Cron stores expression metadata on the class', () => {
    const jobs = Reflect.getMetadata(SCHEDULE_CRON_METADATA, Tasks) as any[];
    const job = jobs.find(j => j.methodName === 'cronTask');
    expect(job.expression).toBe('0 0 12 * * *');
 expect(job.options).toEqual({});
  });

  test('Interval stores milliseconds on the class', () => {
    const jobs = Reflect.getMetadata(SCHEDULE_INTERVAL_METADATA, Tasks) as any[];
    const job = jobs.find(j => j.methodName === 'intervalTask');
    expect(job.interval).toBe(5000);
  });

  test('Timeout stores delay on the class', () => {
    const jobs = Reflect.getMetadata(SCHEDULE_TIMEOUT_METADATA, Tasks) as any[];
    const job = jobs.find(j => j.methodName === 'timeoutTask');
    expect(job.timeout).toBe(10000);
  });
});
