import 'reflect-metadata';
import type { CronOptions, IntervalOptions, TimeoutOptions } from '../interfaces/schedule.interface';

export const SCHEDULE_CRON_METADATA = 'schedule:cron';
export const SCHEDULE_INTERVAL_METADATA = 'schedule:interval';
export const SCHEDULE_TIMEOUT_METADATA = 'schedule:timeout';
export const SCHEDULER_METADATA = 'schedule:scheduler';

export interface CronJobMetadata {
  expression: string;
  options: CronOptions;
  methodName: string;
}

export interface IntervalJobMetadata {
  interval: number;
  options: IntervalOptions;
  methodName: string;
}

export interface TimeoutJobMetadata {
  timeout: number;
  options: TimeoutOptions;
  methodName: string;
}

export function Cron(expression: string, options?: CronOptions): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const jobs: CronJobMetadata[] = 
      Reflect.getMetadata(SCHEDULE_CRON_METADATA, target.constructor) || [];
    
    jobs.push({
      expression,
      options: options || {},
      methodName: String(propertyKey),
    });
    
    Reflect.defineMetadata(SCHEDULE_CRON_METADATA, jobs, target.constructor);
    return descriptor;
  };
}

export function Interval(interval: number, options?: IntervalOptions): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const jobs: IntervalJobMetadata[] = 
      Reflect.getMetadata(SCHEDULE_INTERVAL_METADATA, target.constructor) || [];
    
    jobs.push({
      interval,
      options: options || {},
      methodName: String(propertyKey),
    });
    
    Reflect.defineMetadata(SCHEDULE_INTERVAL_METADATA, jobs, target.constructor);
    return descriptor;
  };
}

export function Timeout(timeout: number, options?: TimeoutOptions): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const jobs: TimeoutJobMetadata[] = 
      Reflect.getMetadata(SCHEDULE_TIMEOUT_METADATA, target.constructor) || [];
    
    jobs.push({
      timeout,
      options: options || {},
      methodName: String(propertyKey),
    });
    
    Reflect.defineMetadata(SCHEDULE_TIMEOUT_METADATA, jobs, target.constructor);
    return descriptor;
  };
}

export function Scheduler(): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(SCHEDULER_METADATA, true, target);
  };
}
