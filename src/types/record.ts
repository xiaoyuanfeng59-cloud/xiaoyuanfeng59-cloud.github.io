export type Timestamp = string;
export type LocalDate = string;

export type EventKey =
  | "evening_end_study"
  | "night_return_dorm_205a"
  | "night_shower"
  | "night_brushed_teeth"
  | "night_get_in_bed"
  | "night_start_sleep"
  | "morning_wake_up"
  | "morning_start_study"
  | "noon_lunch_start"
  | "noon_lunch_end"
  | "noon_start_afternoon_study"
  | "evening_dinner_start"
  | "evening_dinner_end"
  | "evening_start_study";

export type ScoreKey =
  | "night_daily_study_score"
  | "night_alertness_score"
  | "night_body_score"
  | "night_mood_score"
  | "morning_sleep_self_score"
  | "morning_sleep_ring_score"
  | "morning_wake_difficulty_score"
  | "morning_body_score"
  | "morning_mood_score"
  | "noon_morning_study_score"
  | "noon_alertness_score"
  | "noon_body_score"
  | "noon_mood_score"
  | "evening_afternoon_study_score"
  | "evening_alertness_score"
  | "evening_body_score"
  | "evening_mood_score"
  | "bedtime_satisfaction_score";

export type PhoneLevel = "少" | "中" | "多" | "失控";
export type NoiseLevel = "少" | "中" | "多" | "严重";

export interface DailyRecord {
  id: string;
  date: LocalDate;
  events: Partial<Record<EventKey, Timestamp | undefined>>;
  scores: Partial<Record<ScoreKey, number | undefined>>;
  review: {
    water_ml?: number;
    phone_minutes?: number;
    phone_level?: PhoneLevel;
    noise_level?: NoiseLevel;
    diary?: string;
  };
  meta: {
    created_at: Timestamp;
    updated_at: Timestamp;
    completed_core_count: number;
    is_backfilled?: boolean;
  };
}

export interface DailyRecordPatch {
  events?: Partial<Record<EventKey, Timestamp | undefined>>;
  scores?: Partial<Record<ScoreKey, number | undefined>>;
  review?: Partial<DailyRecord["review"]>;
  meta?: Partial<DailyRecord["meta"]>;
}

export type TimelineKind = "event" | "score" | "review";

export interface EventDefinition {
  kind: "event";
  key: EventKey;
  label: string;
  phase: "晨" | "午" | "晚" | "夜";
  reminderKey?: ReminderKey;
}

export interface ScoreFieldDefinition {
  key: ScoreKey;
  label: string;
  anchor: string;
  optional?: boolean;
  input?: "slider" | "number";
}

export interface ScoreGroupDefinition {
  kind: "score";
  id: string;
  label: string;
  fields: ScoreFieldDefinition[];
}

export interface ReviewDefinition {
  kind: "review";
  id: "bedtime_review";
  label: string;
}

export type TimelineItem = EventDefinition | ScoreGroupDefinition | ReviewDefinition;

export type ReminderKey =
  | "wake_record"
  | "lunch_record"
  | "dinner_record"
  | "bedtime_review"
  | "morning_start_study"
  | "noon_start_afternoon_study"
  | "evening_start_study"
  | "night_return_dorm_205a"
  | "night_get_in_bed"
  | "night_start_sleep";

export interface ReminderSetting {
  key: ReminderKey;
  label: string;
  message: string;
  time: string;
  enabled: boolean;
  required: boolean;
  skippedDate?: LocalDate;
  snoozeUntil?: Timestamp;
  dismissedDate?: LocalDate;
}

export interface AppSettings {
  id: "settings";
  reminders: ReminderSetting[];
  notificationPermission?: NotificationPermission | "unsupported";
  updated_at: Timestamp;
}
