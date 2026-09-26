# @galaxy-stack/orbit-schedule

[![npm version](https://img.shields.io/npm/v/@galaxy-stack/orbit-schedule.svg)](https://www.npmjs.com/package/@galaxy-stack/orbit-schedule)
[![docs](https://img.shields.io/badge/docs-galaxy--orbit--framework.vercel.app-blue)](https://galaxy-orbit-framework.vercel.app)

Part of the [Orbit framework](https://github.com/galaxy-orbit/packages) — a NestJS-style backend framework for [Bun](https://bun.sh).

## Installation

```bash
bun add @galaxy-stack/orbit-schedule
```

# @galaxy-stack/orbit-schedule

## Mô tả
Module lập lịch tác vụ cho Orbit với hỗ trợ cron jobs, intervals và timeouts.

## Tính năng chính

### 1. Cron Jobs
Chạy tác vụ theo lịch cron:

```typescript
import { Scheduler, Cron, CronExpressions } from '@galaxy-stack/orbit-schedule';

@Scheduler()
class TasksService {
  @Cron('0 0 * * * *')  // Mỗi giờ
  handleCron() {
    console.log('Chạy mỗi giờ');
  }

  @Cron(CronExpressions.EVERY_DAY_AT_MIDNIGHT)
  dailyTask() {
    console.log('Chạy lúc nửa đêm');
  }
}
```

### 2. Intervals
Chạy lặp lại theo khoảng thời gian:

```typescript
@Scheduler()
class TasksService {
  @Interval(10000)  // Mỗi 10 giây
  handleInterval() {
    console.log('Chạy mỗi 10 giây');
  }
}
```

### 3. Timeouts
Chạy một lần sau khoảng thời gian:

```typescript
@Scheduler()
class TasksService {
  @Timeout(5000)  // Sau 5 giây
  handleTimeout() {
    console.log('Chạy một lần sau 5 giây');
  }
}
```

## Cron Expressions

### Format
```
┌───────────── giây (0-59) [tùy chọn]
│ ┌─────────── phút (0-59)
│ │ ┌───────── giờ (0-23)
│ │ │ ┌─────── ngày trong tháng (1-31)
│ │ │ │ ┌───── tháng (1-12)
│ │ │ │ │ ┌─── ngày trong tuần (0-6, 0=Chủ nhật)
│ │ │ │ │ │
* * * * * *
```

### Ví dụ
| Expression | Mô tả |
|------------|-------|
| `* * * * * *` | Mỗi giây |
| `0 * * * * *` | Mỗi phút |
| `0 0 * * * *` | Mỗi giờ |
| `0 0 0 * * *` | Mỗi ngày lúc nửa đêm |
| `0 0 12 * * *` | Mỗi ngày lúc 12h trưa |
| `0 0 0 * * 0` | Mỗi Chủ nhật |
| `0 0 0 1 * *` | Ngày 1 mỗi tháng |

### CronExpressions có sẵn
```typescript
CronExpressions.EVERY_SECOND
CronExpressions.EVERY_5_SECONDS
CronExpressions.EVERY_MINUTE
CronExpressions.EVERY_HOUR
CronExpressions.EVERY_DAY_AT_MIDNIGHT
CronExpressions.EVERY_DAY_AT_NOON
CronExpressions.EVERY_WEEK
CronExpressions.EVERY_WEEKDAY
CronExpressions.EVERY_WEEKEND
```

## Cấu hình Module

```typescript
import { ScheduleModule } from '@galaxy-stack/orbit-schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [TasksService],
})
class AppModule {}
```

## Quản lý Job động

```typescript
import { SchedulerService, SchedulerRegistry } from '@galaxy-stack/orbit-schedule';

class DynamicScheduler {
  constructor(
    private scheduler: SchedulerService,
    private registry: SchedulerRegistry,
  ) {}

  addJob() {
    this.scheduler.addCronJob('myJob', '0 * * * * *', () => {
      console.log('Dynamic job');
    });
  }

  removeJob() {
    this.registry.deleteCronJob('myJob');
  }

  getJobs() {
    return this.registry.getCronJobs();
  }
}
```

## Options

```typescript
@Cron('* * * * *', {
  name: 'my-cron-job',
  timeZone: 'Asia/Ho_Chi_Minh',
  disabled: false,
  runOnInit: true,  // Chạy ngay khi app start
})
```
