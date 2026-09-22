export interface CronOptions {
  name?: string;
  timeZone?: string;
  disabled?: boolean;
  runOnInit?: boolean;
}

export interface IntervalOptions {
  name?: string;
  disabled?: boolean;
  runOnInit?: boolean;
}

export interface TimeoutOptions {
  name?: string;
  disabled?: boolean;
}

export interface ScheduledJob {
  name: string;
  type: 'cron' | 'interval' | 'timeout';
  expression?: string;
  interval?: number;
  timeout?: number;
  handler: () => void | Promise<void>;
  lastRun?: Date;
  nextRun?: Date;
  running: boolean;
  disabled: boolean;
  timerId?: Timer;
}

export interface CronExpression {
  second: string;
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

export interface ScheduleModuleOptions {
  cronJobs?: boolean;
  disabled?: boolean;
}
