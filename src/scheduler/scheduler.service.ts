import 'reflect-metadata';
import type { ScheduledJob } from '../interfaces/schedule.interface';
import { CronParser } from '../cron/cron-parser';
import {
  SCHEDULE_CRON_METADATA,
  SCHEDULE_INTERVAL_METADATA,
  SCHEDULE_TIMEOUT_METADATA,
  SCHEDULER_METADATA,
  type CronJobMetadata,
  type IntervalJobMetadata,
  type TimeoutJobMetadata,
} from '../decorators/schedule.decorators';

export class SchedulerRegistry {
  private readonly cronJobs: Map<string, ScheduledJob> = new Map();
  private readonly intervalJobs: Map<string, ScheduledJob> = new Map();
  private readonly timeoutJobs: Map<string, ScheduledJob> = new Map();

  getCronJob(name: string): ScheduledJob | undefined {
    return this.cronJobs.get(name);
  }

  getCronJobs(): Map<string, ScheduledJob> {
    return new Map(this.cronJobs);
  }

  addCronJob(name: string, job: ScheduledJob): void {
    if (this.cronJobs.has(name)) {
      throw new Error(`Cron job "${name}" already exists`);
    }
    this.cronJobs.set(name, job);
  }

  deleteCronJob(name: string): void {
    const job = this.cronJobs.get(name);
    if (job?.timerId) {
      clearTimeout(job.timerId);
    }
    this.cronJobs.delete(name);
  }

  getInterval(name: string): ScheduledJob | undefined {
    return this.intervalJobs.get(name);
  }

  getIntervals(): Map<string, ScheduledJob> {
    return new Map(this.intervalJobs);
  }

  addInterval(name: string, job: ScheduledJob): void {
    if (this.intervalJobs.has(name)) {
      throw new Error(`Interval "${name}" already exists`);
    }
    this.intervalJobs.set(name, job);
  }

  deleteInterval(name: string): void {
    const job = this.intervalJobs.get(name);
    if (job?.timerId) {
      clearInterval(job.timerId);
    }
    this.intervalJobs.delete(name);
  }

  getTimeout(name: string): ScheduledJob | undefined {
    return this.timeoutJobs.get(name);
  }

  getTimeouts(): Map<string, ScheduledJob> {
    return new Map(this.timeoutJobs);
  }

  addTimeout(name: string, job: ScheduledJob): void {
    if (this.timeoutJobs.has(name)) {
      throw new Error(`Timeout "${name}" already exists`);
    }
    this.timeoutJobs.set(name, job);
  }

  deleteTimeout(name: string): void {
    const job = this.timeoutJobs.get(name);
    if (job?.timerId) {
      clearTimeout(job.timerId);
    }
    this.timeoutJobs.delete(name);
  }

  stopAll(): void {
    for (const [name] of this.cronJobs) {
      this.deleteCronJob(name);
    }
    for (const [name] of this.intervalJobs) {
      this.deleteInterval(name);
    }
    for (const [name] of this.timeoutJobs) {
      this.deleteTimeout(name);
    }
  }
}

export class SchedulerService {
  private readonly registry: SchedulerRegistry;
  private readonly schedulers: Map<any, any> = new Map();

  constructor(registry?: SchedulerRegistry) {
    this.registry = registry || new SchedulerRegistry();
  }

  getRegistry(): SchedulerRegistry {
    return this.registry;
  }

  registerScheduler(instance: any): void {
    const constructor = instance.constructor;
    
    if (!Reflect.getMetadata(SCHEDULER_METADATA, constructor)) {
      return;
    }

    this.schedulers.set(constructor, instance);

    const cronJobs: CronJobMetadata[] = 
      Reflect.getMetadata(SCHEDULE_CRON_METADATA, constructor) || [];
    
    for (const job of cronJobs) {
      if (!job.options.disabled) {
        this.addCronJob(
          job.options.name || `${constructor.name}.${job.methodName}`,
          job.expression,
          () => instance[job.methodName](),
          job.options.runOnInit
        );
      }
    }

    const intervalJobs: IntervalJobMetadata[] = 
      Reflect.getMetadata(SCHEDULE_INTERVAL_METADATA, constructor) || [];
    
    for (const job of intervalJobs) {
      if (!job.options.disabled) {
        this.addInterval(
          job.options.name || `${constructor.name}.${job.methodName}`,
          job.interval,
          () => instance[job.methodName](),
          job.options.runOnInit
        );
      }
    }

    const timeoutJobs: TimeoutJobMetadata[] = 
      Reflect.getMetadata(SCHEDULE_TIMEOUT_METADATA, constructor) || [];
    
    for (const job of timeoutJobs) {
      if (!job.options.disabled) {
        this.addTimeout(
          job.options.name || `${constructor.name}.${job.methodName}`,
          job.timeout,
          () => instance[job.methodName]()
        );
      }
    }
  }

  addCronJob(
    name: string,
    expression: string,
    handler: () => void | Promise<void>,
    runOnInit?: boolean
  ): void {
    const job: ScheduledJob = {
      name,
      type: 'cron',
      expression,
      handler,
      running: false,
      disabled: false,
    };

    const scheduleNext = () => {
      if (job.disabled) return;
      
      const delay = CronParser.getDelayToNextRun(expression);
      job.nextRun = new Date(Date.now() + delay);
      
      job.timerId = setTimeout(async () => {
        if (job.disabled || job.running) return;
        
        job.running = true;
        job.lastRun = new Date();
        
        try {
          await handler();
        } catch (error) {
          console.error(`Cron job "${name}" failed:`, error);
        } finally {
          job.running = false;
          scheduleNext();
        }
      }, delay);
    };

    this.registry.addCronJob(name, job);
    
    if (runOnInit) {
      Promise.resolve().then(handler).catch(console.error);
    }
    
    scheduleNext();
  }

  addInterval(
    name: string,
    interval: number,
    handler: () => void | Promise<void>,
    runOnInit?: boolean
  ): void {
    const job: ScheduledJob = {
      name,
      type: 'interval',
      interval,
      handler,
      running: false,
      disabled: false,
    };

    if (runOnInit) {
      Promise.resolve().then(handler).catch(console.error);
    }

    job.timerId = setInterval(async () => {
      if (job.disabled || job.running) return;
      
      job.running = true;
      job.lastRun = new Date();
      
      try {
        await handler();
      } catch (error) {
        console.error(`Interval "${name}" failed:`, error);
      } finally {
        job.running = false;
      }
    }, interval);

    this.registry.addInterval(name, job);
  }

  addTimeout(
    name: string,
    timeout: number,
    handler: () => void | Promise<void>
  ): void {
    const job: ScheduledJob = {
      name,
      type: 'timeout',
      timeout,
      handler,
      running: false,
      disabled: false,
    };

    job.timerId = setTimeout(async () => {
      if (job.disabled) return;
      
      job.running = true;
      job.lastRun = new Date();
      
      try {
        await handler();
      } catch (error) {
        console.error(`Timeout "${name}" failed:`, error);
      } finally {
        job.running = false;
        this.registry.deleteTimeout(name);
      }
    }, timeout);

    this.registry.addTimeout(name, job);
  }

  stopAll(): void {
    this.registry.stopAll();
  }
}

export const SCHEDULER_REGISTRY = Symbol('SCHEDULER_REGISTRY');
export const SCHEDULER_SERVICE = Symbol('SCHEDULER_SERVICE');
