import type { DynamicModule } from '@galaxy-stack/orbit-core';
import type { ScheduleModuleOptions } from './interfaces/schedule.interface';
import { 
  SchedulerRegistry, 
  SchedulerService,
  SCHEDULER_REGISTRY,
  SCHEDULER_SERVICE,
} from './scheduler/scheduler.service';

export const SCHEDULE_OPTIONS = Symbol('SCHEDULE_OPTIONS');

export class ScheduleModule {
  static forRoot(options: ScheduleModuleOptions = {}): DynamicModule {
    return {
      module: ScheduleModule,
      global: true,
      providers: [
        {
          provide: SCHEDULE_OPTIONS,
          useValue: options,
        },
        {
          provide: SCHEDULER_REGISTRY,
          useFactory: () => new SchedulerRegistry(),
        },
        {
          provide: SchedulerRegistry,
          useExisting: SCHEDULER_REGISTRY,
        },
        {
          provide: SCHEDULER_SERVICE,
          useFactory: (registry: SchedulerRegistry) => new SchedulerService(registry),
          inject: [SCHEDULER_REGISTRY],
        },
        {
          provide: SchedulerService,
          useExisting: SCHEDULER_SERVICE,
        },
      ],
      exports: [
        SCHEDULE_OPTIONS,
        SCHEDULER_REGISTRY,
        SchedulerRegistry,
        SCHEDULER_SERVICE,
        SchedulerService,
      ],
    };
  }
}
