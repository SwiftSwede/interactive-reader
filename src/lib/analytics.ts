import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emptyTagIndex,
  loadTagDisplayNames,
  type TagDisplayIndex,
} from "@/lib/ficha";

export const ANALYTICS_WORD_LIMIT = 15;
export const ANALYTICS_ERROR_LIMIT = 10;
export const SOUND_BANK_MIN_STUDENTS = 3;

export type AnalyticsLookupRow = {
  userId: string;
  text: string;
};

export type AnalyticsEvidenceRow = {
  userId: string;
  tagType: "error" | "phonetic";
  tagId: string;
};

export type AnalyticsErrorEventRow = {
  userId: string;
  errorTags: string[];
};

export type AnalyticsWord = {
  flagText: string;
  studentCount: number;
  timesTotal: number;
};

export type AnalyticsError = {
  tagId: string;
  displayName: string;
  studentCount: number;
  signalCount: number;
};

export type AnalyticsSound = {
  tagId: string;
  displayName: string;
  studentCount: number;
};

export type CourseAnalytics = {
  words: AnalyticsWord[];
  errors: AnalyticsError[];
  sounds: AnalyticsSound[];
};

export type BuildAnalyticsInput = {
  tagIndex: TagDisplayIndex;
  lookups: AnalyticsLookupRow[];
  evidence: AnalyticsEvidenceRow[];
  errorEvents: AnalyticsErrorEventRow[];
};

export function emptyCourseAnalytics(): CourseAnalytics {
  return { words: [], errors: [], sounds: [] };
}

export function isSoundBankCandidate(studentCount: number): boolean {
  return studentCount >= SOUND_BANK_MIN_STUDENTS;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function resolveErrorTag(
  index: TagDisplayIndex,
  name: string
): { tagId: string; displayName: string } {
  const preferred = index.byName.get(`error:${name}`);
  if (!preferred) {
    return { tagId: name, displayName: name };
  }
  for (const [id, display] of index.byId) {
    if (display.tagType === "error" && display.name === name) {
      return { tagId: id, displayName: preferred.displayName };
    }
  }
  return { tagId: name, displayName: preferred.displayName };
}

function resolveDisplayName(index: TagDisplayIndex, tagId: string): string {
  return index.byId.get(tagId)?.displayName ?? tagId;
}

function groupLookups(
  rows: AnalyticsLookupRow[],
  limit: number = ANALYTICS_WORD_LIMIT
): AnalyticsWord[] {
  const byText = new Map<
    string,
    { flagText: string; students: Set<string>; timesTotal: number }
  >();

  for (const row of rows) {
    const text = row.text.trim();
    if (!text) continue;
    const key = text.toLowerCase();
    const existing = byText.get(key);
    if (!existing) {
      byText.set(key, {
        flagText: text,
        students: new Set([row.userId]),
        timesTotal: 1,
      });
      continue;
    }
    existing.students.add(row.userId);
    existing.timesTotal += 1;
  }

  return [...byText.values()]
    .map((entry) => ({
      flagText: entry.flagText,
      studentCount: entry.students.size,
      timesTotal: entry.timesTotal,
    }))
    .sort((a, b) => {
      if (b.studentCount !== a.studentCount) {
        return b.studentCount - a.studentCount;
      }
      if (b.timesTotal !== a.timesTotal) {
        return b.timesTotal - a.timesTotal;
      }
      return a.flagText.localeCompare(b.flagText, "es");
    })
    .slice(0, limit);
}

function mergeErrors(
  index: TagDisplayIndex,
  evidence: AnalyticsEvidenceRow[],
  events: AnalyticsErrorEventRow[],
  limit: number = ANALYTICS_ERROR_LIMIT
): AnalyticsError[] {
  const byTag = new Map<
    string,
    { displayName: string; students: Set<string>; signalCount: number }
  >();

  const take = (tagId: string, displayName: string) => {
    const existing = byTag.get(tagId);
    if (existing) return existing;
    const created = {
      displayName,
      students: new Set<string>(),
      signalCount: 0,
    };
    byTag.set(tagId, created);
    return created;
  };

  for (const row of evidence) {
    if (row.tagType !== "error") continue;
    const entry = take(row.tagId, resolveDisplayName(index, row.tagId));
    entry.students.add(row.userId);
  }

  for (const event of events) {
    for (const name of event.errorTags) {
      if (!name) continue;
      const resolved = resolveErrorTag(index, name);
      const entry = take(resolved.tagId, resolved.displayName);
      entry.students.add(event.userId);
      entry.signalCount += 1;
    }
  }

  return [...byTag.entries()]
    .map(([tagId, entry]) => ({
      tagId,
      displayName: entry.displayName,
      studentCount: entry.students.size,
      signalCount: entry.signalCount,
    }))
    .sort((a, b) => {
      if (b.studentCount !== a.studentCount) {
        return b.studentCount - a.studentCount;
      }
      if (b.signalCount !== a.signalCount) {
        return b.signalCount - a.signalCount;
      }
      return a.displayName.localeCompare(b.displayName, "es");
    })
    .slice(0, limit);
}

function groupSounds(
  index: TagDisplayIndex,
  evidence: AnalyticsEvidenceRow[]
): AnalyticsSound[] {
  const byTag = new Map<string, { displayName: string; students: Set<string> }>();

  for (const row of evidence) {
    if (row.tagType !== "phonetic") continue;
    const existing = byTag.get(row.tagId);
    if (!existing) {
      byTag.set(row.tagId, {
        displayName: resolveDisplayName(index, row.tagId),
        students: new Set([row.userId]),
      });
      continue;
    }
    existing.students.add(row.userId);
  }

  return [...byTag.entries()]
    .map(([tagId, entry]) => ({
      tagId,
      displayName: entry.displayName,
      studentCount: entry.students.size,
    }))
    .filter((row) => row.studentCount >= 1)
    .sort((a, b) => {
      if (b.studentCount !== a.studentCount) {
        return b.studentCount - a.studentCount;
      }
      return a.displayName.localeCompare(b.displayName, "es");
    });
}

export function buildAnalytics(input: BuildAnalyticsInput): CourseAnalytics {
  return {
    words: groupLookups(input.lookups),
    errors: mergeErrors(input.tagIndex, input.evidence, input.errorEvents),
    sounds: groupSounds(input.tagIndex, input.evidence),
  };
}

async function loadEnrolledStudentIds(
  supabase: SupabaseClient,
  courseId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("course_enrollments")
    .select("student_id")
    .eq("course_id", courseId);

  if (error) {
    console.error("loadCourseAnalytics enrollments failed:", error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => row.student_id as string)
    .filter(Boolean);
}

async function loadLookups(
  supabase: SupabaseClient,
  studentIds: string[]
): Promise<AnalyticsLookupRow[]> {
  const { data, error } = await supabase
    .from("word_lookups")
    .select("user_id, words ( text )")
    .in("user_id", studentIds);

  if (error) {
    console.error("loadCourseAnalytics lookups failed:", error.message);
    return [];
  }

  type LookupRow = {
    user_id: string;
    words: { text: string } | { text: string }[] | null;
  };

  const rows: AnalyticsLookupRow[] = [];
  for (const row of (data ?? []) as LookupRow[]) {
    const word = Array.isArray(row.words) ? row.words[0] : row.words;
    if (!word?.text) continue;
    rows.push({ userId: row.user_id, text: word.text });
  }
  return rows;
}

async function loadEvidence(
  supabase: SupabaseClient,
  studentIds: string[]
): Promise<AnalyticsEvidenceRow[]> {
  const { data, error } = await supabase
    .from("user_topic_evidence")
    .select("user_id, tag_type, tag_id")
    .in("user_id", studentIds)
    .eq("status", "needs_more_practice")
    .in("tag_type", ["error", "phonetic"]);

  if (error) {
    console.error("loadCourseAnalytics evidence failed:", error.message);
    return [];
  }

  const rows: AnalyticsEvidenceRow[] = [];
  for (const row of data ?? []) {
    if (row.tag_type !== "error" && row.tag_type !== "phonetic") continue;
    rows.push({
      userId: row.user_id as string,
      tagType: row.tag_type,
      tagId: row.tag_id as string,
    });
  }
  return rows;
}

async function loadErrorEvents(
  supabase: SupabaseClient,
  studentIds: string[]
): Promise<AnalyticsErrorEventRow[]> {
  const { data, error } = await supabase
    .from("learning_events")
    .select("user_id, detail")
    .in("user_id", studentIds)
    .eq("event_type", "check_answer_error");

  if (error) {
    console.error("loadCourseAnalytics error events failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const detail =
      row.detail && typeof row.detail === "object"
        ? (row.detail as Record<string, unknown>)
        : {};
    return {
      userId: row.user_id as string,
      errorTags: asStringArray(detail.error_tags),
    };
  });
}

export async function loadCourseAnalytics(
  supabase: SupabaseClient,
  courseId: string
): Promise<CourseAnalytics> {
  const studentIds = await loadEnrolledStudentIds(supabase, courseId);
  if (studentIds.length === 0) {
    return emptyCourseAnalytics();
  }

  const [tagIndex, lookups, evidence, errorEvents] = await Promise.all([
    loadTagDisplayNames(supabase),
    loadLookups(supabase, studentIds),
    loadEvidence(supabase, studentIds),
    loadErrorEvents(supabase, studentIds),
  ]);

  return buildAnalytics({
    tagIndex: tagIndex ?? emptyTagIndex(),
    lookups,
    evidence,
    errorEvents,
  });
}
