// ─── Types ────────────────────────────────────────────────────────────────────

export type SlotEntry = {
  date: string;
  startTime: string;
  count: number;
  users: {
    name: string | null;
    email: string;
    image: string | null;
    committee: string | null;
  }[];
};

export type UserEntry = {
  id: string;
  name: string | null;
  email: string;
  nuId: string | null;
  image: string | null;
  committee: string | null;
  totalSlots: number;
  byDate: Record<string, string[]>;
};

export type AnalyticsData = {
  totalUsers: number;
  totalSlots: number;
  maxCount: number;
  slotMatrix: SlotEntry[];
  users: UserEntry[];
  dates: string[];
  timeSlots: string[];
  /** start → end for custom-length slots; missing means one hour */
  slotEnds?: Record<string, string>;
};
