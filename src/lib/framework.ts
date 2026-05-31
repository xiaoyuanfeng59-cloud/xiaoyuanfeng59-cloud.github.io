import type {
  EventDefinition,
  EventKey,
  ReminderKey,
  ReminderSetting,
  ScoreFieldDefinition,
  ScoreGroupDefinition,
  ScoreKey,
  TimelineItem,
} from "../types/record";

const anchor = {
  study: "1 几乎没有有效学习；5 正常完成一部分任务；10 高质量接近理想。",
  alertness: "1 困到难以集中；5 普通清醒；10 非常专注接近心流。",
  body: "1 明显不适；5 一般；10 身体轻松、精力充足。",
  mood: "1 低落/焦虑/烦躁；5 平稳；10 愉快、有期待感。",
  sleepSelf: "1 睡得很差；5 普通；10 睡得很好、恢复感强。",
  ring: "戒指原始分数，空着也可以。",
  wakeDifficulty: "1 非常容易起床；5 有点困难；10 极其困难。",
  wakeBody: "1 很难受；5 普通；10 身体状态很好。",
  wakeMood: "1 很抗拒/低落；5 平稳；10 心情很好/期待今天。",
  satisfaction: "1 今天很失败/空耗；5 普通；10 对今天非常认可。",
};

const score = (
  key: ScoreKey,
  label: string,
  anchorText: string,
  input: ScoreFieldDefinition["input"] = "slider",
  optional = false,
): ScoreFieldDefinition => ({ key, label, anchor: anchorText, input, optional });

const event = (
  key: EventKey,
  label: string,
  phase: EventDefinition["phase"],
  reminderKey?: ReminderKey,
): EventDefinition => ({ kind: "event", key, label, phase, reminderKey });

export const timeline: TimelineItem[] = [
  event("morning_wake_up", "晨：早起", "晨", "wake_record"),
  {
    kind: "score",
    id: "morning_scores",
    label: "记录：（晨）睡眠、起床身体和情绪",
    fields: [
      score("morning_sleep_self_score", "睡眠自我评分", anchor.sleepSelf),
      score("morning_sleep_ring_score", "睡眠戒指评分", anchor.ring, "number", true),
      score("morning_wake_difficulty_score", "起床难度评分", anchor.wakeDifficulty),
      score("morning_body_score", "起床身体状态评分", anchor.wakeBody),
      score("morning_mood_score", "起床情绪评分", anchor.wakeMood),
    ],
  },
  event("morning_start_study", "晨：开始学习", "晨", "morning_start_study"),
  event("noon_lunch_start", "午：吃午饭", "午"),
  event("noon_lunch_end", "午：吃完午饭", "午", "lunch_record"),
  {
    kind: "score",
    id: "noon_scores",
    label: "记录：（午）上午学习、清醒、身体、情绪",
    fields: [
      score("noon_morning_study_score", "上午学习评分", anchor.study),
      score("noon_alertness_score", "清醒评分", anchor.alertness),
      score("noon_body_score", "身体评分", anchor.body),
      score("noon_mood_score", "情绪评分", anchor.mood),
    ],
  },
  event("noon_start_afternoon_study", "午：开始下午学习", "午", "noon_start_afternoon_study"),
  event("evening_dinner_start", "晚：吃晚饭", "晚"),
  event("evening_dinner_end", "晚：吃完晚饭", "晚", "dinner_record"),
  {
    kind: "score",
    id: "evening_scores",
    label: "记录：（晚）下午学习、清醒、身体、情绪",
    fields: [
      score("evening_afternoon_study_score", "下午学习评分", anchor.study),
      score("evening_alertness_score", "清醒评分", anchor.alertness),
      score("evening_body_score", "身体评分", anchor.body),
      score("evening_mood_score", "情绪评分", anchor.mood),
    ],
  },
  event("evening_start_study", "晚：开始学习", "晚", "evening_start_study"),
  event("evening_end_study", "晚：结束学习（离开自习 / 上课场所）", "晚"),
  event("night_return_dorm_205a", "夜：回到寝室（进入 205A 门）", "夜", "night_return_dorm_205a"),
  event("night_shower", "夜：去洗澡", "夜"),
  event("night_brushed_teeth", "夜：刷完牙", "夜"),
  event("night_get_in_bed", "夜：爬上床", "夜", "night_get_in_bed"),
  {
    kind: "score",
    id: "night_scores",
    label: "记录：（夜）今日全天学习、清醒、身体、情绪",
    fields: [
      score("night_daily_study_score", "今日全天学习评分", anchor.study),
      score("night_alertness_score", "清醒评分", anchor.alertness),
      score("night_body_score", "身体评分", anchor.body),
      score("night_mood_score", "情绪评分", anchor.mood),
    ],
  },
  { kind: "review", id: "bedtime_review", label: "睡前复盘 + 简要日记大事记" },
  event("night_start_sleep", "夜：开始入睡", "夜", "night_start_sleep"),
];

export const eventDefinitions = timeline.filter((item): item is EventDefinition => item.kind === "event");
export const scoreGroups = timeline.filter((item): item is ScoreGroupDefinition => item.kind === "score");

export const eventLabels = Object.fromEntries(eventDefinitions.map((item) => [item.key, item.label])) as Record<
  EventKey,
  string
>;

export const scoreLabels = Object.fromEntries(
  scoreGroups.flatMap((group) => group.fields.map((field) => [field.key, field.label])),
) as Record<ScoreKey, string>;

export const defaultReminders: ReminderSetting[] = [
  {
    key: "wake_record",
    label: "起床后记录提醒",
    message: "漏记没关系，现在顺手补一下晨间状态也可以。",
    time: "08:30",
    enabled: true,
    required: true,
  },
  {
    key: "lunch_record",
    label: "午饭后记录提醒",
    message: "可以顺手记一下上午状态了。",
    time: "12:45",
    enabled: true,
    required: true,
  },
  {
    key: "dinner_record",
    label: "晚饭后记录提醒",
    message: "花半分钟记一下下午状态就好。",
    time: "18:45",
    enabled: true,
    required: true,
  },
  {
    key: "bedtime_review",
    label: "睡前复盘提醒",
    message: "睡前 30 秒复盘一下今天。",
    time: "23:30",
    enabled: true,
    required: true,
  },
  {
    key: "morning_start_study",
    label: "开始上午学习",
    message: "开始学习时点一下就好。",
    time: "09:00",
    enabled: false,
    required: false,
  },
  {
    key: "noon_start_afternoon_study",
    label: "开始下午学习",
    message: "下午开始了，顺手留一个时间点。",
    time: "14:00",
    enabled: false,
    required: false,
  },
  {
    key: "evening_start_study",
    label: "开始晚上学习",
    message: "晚上学习开始时可以轻轻记一下。",
    time: "19:15",
    enabled: false,
    required: false,
  },
  {
    key: "night_return_dorm_205a",
    label: "回寝室",
    message: "回到寝室了，点一下记录进入 205A 的时间。",
    time: "22:30",
    enabled: false,
    required: false,
  },
  {
    key: "night_get_in_bed",
    label: "爬上床",
    message: "上床后记一下，今天的数据会更完整。",
    time: "23:45",
    enabled: false,
    required: false,
  },
  {
    key: "night_start_sleep",
    label: "开始入睡",
    message: "准备入睡时轻点一下，晚安。",
    time: "00:10",
    enabled: false,
    required: false,
  },
];
