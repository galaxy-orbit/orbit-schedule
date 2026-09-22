import type { CronExpression } from '../interfaces/schedule.interface';

export class CronParser {
  static parse(expression: string): CronExpression {
    const parts = expression.trim().split(/\s+/);
    
    if (parts.length === 5) {
      return {
        second: '0',
        minute: parts[0],
        hour: parts[1],
        dayOfMonth: parts[2],
        month: parts[3],
        dayOfWeek: parts[4],
      };
    }
    
    if (parts.length === 6) {
      return {
        second: parts[0],
        minute: parts[1],
        hour: parts[2],
        dayOfMonth: parts[3],
        month: parts[4],
        dayOfWeek: parts[5],
      };
    }
    
    throw new Error(`Invalid cron expression: ${expression}. Expected 5 or 6 fields.`);
  }

  static getNextRun(expression: string, fromDate: Date = new Date()): Date {
    const cron = this.parse(expression);
    const next = new Date(fromDate);
    next.setMilliseconds(0);
    next.setSeconds(next.getSeconds() + 1);
    
    for (let attempts = 0; attempts < 1000; attempts++) {
      if (!this.matchField(cron.month, next.getMonth() + 1, 1, 12)) {
        next.setMonth(next.getMonth() + 1);
        next.setDate(1);
        next.setHours(0, 0, 0, 0);
        continue;
      }
      
      if (!this.matchField(cron.dayOfMonth, next.getDate(), 1, 31) ||
          !this.matchField(cron.dayOfWeek, next.getDay(), 0, 6)) {
        next.setDate(next.getDate() + 1);
        next.setHours(0, 0, 0, 0);
        continue;
      }
      
      if (!this.matchField(cron.hour, next.getHours(), 0, 23)) {
        next.setHours(next.getHours() + 1);
        next.setMinutes(0);
        next.setSeconds(0);
        continue;
      }
      
      if (!this.matchField(cron.minute, next.getMinutes(), 0, 59)) {
        next.setMinutes(next.getMinutes() + 1);
        next.setSeconds(0);
        continue;
      }
      
      if (!this.matchField(cron.second, next.getSeconds(), 0, 59)) {
        next.setSeconds(next.getSeconds() + 1);
        continue;
      }
      
      return next;
    }
    
    throw new Error('Could not find next run time within reasonable iterations');
  }

  static matches(cron: CronExpression, date: Date): boolean {
    return (
      this.matchField(cron.second, date.getSeconds(), 0, 59) &&
      this.matchField(cron.minute, date.getMinutes(), 0, 59) &&
      this.matchField(cron.hour, date.getHours(), 0, 23) &&
      this.matchField(cron.dayOfMonth, date.getDate(), 1, 31) &&
      this.matchField(cron.month, date.getMonth() + 1, 1, 12) &&
      this.matchField(cron.dayOfWeek, date.getDay(), 0, 6)
    );
  }

  private static matchField(field: string, value: number, min: number, max: number): boolean {
    if (field === '*') return true;
    
    const parts = field.split(',');
    
    for (const part of parts) {
      if (part.includes('/')) {
        const [range, step] = part.split('/');
        const stepNum = parseInt(step, 10);
        const [start, end] = this.parseRange(range, min, max);
        
        for (let i = start; i <= end; i += stepNum) {
          if (i === value) return true;
        }
      } else if (part.includes('-')) {
        const [start, end] = this.parseRange(part, min, max);
        if (value >= start && value <= end) return true;
      } else {
        if (parseInt(part, 10) === value) return true;
      }
    }
    
    return false;
  }

  private static parseRange(range: string, min: number, max: number): [number, number] {
    if (range === '*') return [min, max];
    
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(n => parseInt(n, 10));
      return [start, end];
    }
    
    const num = parseInt(range, 10);
    return [num, max];
  }

  static getDelayToNextRun(expression: string): number {
    const now = new Date();
    const next = this.getNextRun(expression, now);
    return next.getTime() - now.getTime();
  }

  static getNextNRuns(expression: string, n: number, fromDate: Date = new Date()): Date[] {
    const runs: Date[] = [];
    let current = fromDate;
    
    for (let i = 0; i < n; i++) {
      const next = this.getNextRun(expression, current);
      runs.push(next);
      current = new Date(next.getTime() + 1000);
    }
    
    return runs;
  }
}

export const CronExpressions = {
  EVERY_SECOND: '* * * * * *',
  EVERY_5_SECONDS: '*/5 * * * * *',
  EVERY_10_SECONDS: '*/10 * * * * *',
  EVERY_30_SECONDS: '*/30 * * * * *',
  EVERY_MINUTE: '0 * * * * *',
  EVERY_5_MINUTES: '0 */5 * * * *',
  EVERY_10_MINUTES: '0 */10 * * * *',
  EVERY_30_MINUTES: '0 */30 * * * *',
  EVERY_HOUR: '0 0 * * * *',
  EVERY_DAY_AT_MIDNIGHT: '0 0 0 * * *',
  EVERY_DAY_AT_NOON: '0 0 12 * * *',
  EVERY_WEEK: '0 0 0 * * 0',
  EVERY_WEEKDAY: '0 0 0 * * 1-5',
  EVERY_WEEKEND: '0 0 0 * * 0,6',
  EVERY_1ST_DAY_OF_MONTH: '0 0 0 1 * *',
  EVERY_QUARTER: '0 0 0 1 */3 *',
  EVERY_YEAR: '0 0 0 1 1 *',
};
