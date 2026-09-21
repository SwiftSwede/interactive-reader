
-- Audit Fix 2: baseline capture of the live public schema (2026-09-21).
-- Schema only. Not a schema change. Already live; mark this version applied
-- (`supabase migration repair 20260921035119 --status applied`) rather than
-- db push. New schema changes go through `supabase migration new`. Loose
-- supabase/schema-*.sql files are historical documentation only.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."can_read_story"("p_story_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stories s
    WHERE s.id = p_story_id
      AND (
        s.is_free = true
        OR public.is_teacher()
        OR EXISTS (
          SELECT 1
          FROM public.course_sessions cs
          JOIN public.course_enrollments ce ON ce.course_id = cs.course_id
          WHERE cs.story_id = p_story_id
            AND ce.student_id = auth.uid()
        )
      )
  );
$$;


ALTER FUNCTION "public"."can_read_story"("p_story_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."consume_check_answer_request"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  recent_times timestamptz[];
  checked_at timestamptz;
begin
  insert into public.check_answer_rate_limits (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  -- Serialize count + reservation for this user across all serverless instances.
  select request_times into strict recent_times
  from public.check_answer_rate_limits
  where user_id = p_user_id
  for update;

  -- Read the clock after acquiring the lock, not at transaction start.
  checked_at := clock_timestamp();
  select coalesce(array_agg(request_time), '{}'::timestamptz[])
  into recent_times
  from unnest(recent_times) as requests(request_time)
  where request_time > checked_at - interval '1 hour';

  if cardinality(recent_times) >= 10 then
    return false;
  end if;

  update public.check_answer_rate_limits
  set request_times = array_append(recent_times, checked_at)
  where user_id = p_user_id;
  return true;
end;
$$;


ALTER FUNCTION "public"."consume_check_answer_request"("p_user_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."course_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "story_id" "uuid",
    "session_date" "date" NOT NULL,
    "session_start_time" timestamp with time zone NOT NULL,
    "session_end_time" timestamp with time zone NOT NULL,
    "answers_revealed" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "session_link_token" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "session_type" "text" DEFAULT 'story'::"text" NOT NULL,
    "writing_prompt_id" "uuid",
    "timer_started_at" timestamp with time zone,
    "exam_prompt_id" "uuid",
    "video_playing" boolean DEFAULT false NOT NULL,
    "video_seconds" real DEFAULT 0 NOT NULL,
    "video_rate" real DEFAULT 1 NOT NULL,
    "video_updated_at" timestamp with time zone,
    "presentation_prompt_id" "uuid",
    "presentation_step" "text",
    "recording_youtube_url" "text",
    "class_ended_at" timestamp with time zone,
    "conversation_prompt_id" "uuid",
    "round_current" integer DEFAULT 0 NOT NULL,
    "round_state" "text" DEFAULT 'idle'::"text" NOT NULL,
    "round_started_at" timestamp with time zone,
    "conversation_plan" "text" DEFAULT 'standard'::"text" NOT NULL,
    "lesson_step_current" "text",
    "lesson_step_locked" boolean DEFAULT false NOT NULL,
    "song_class_answers" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "course_sessions_activity_check" CHECK (((("session_type" = 'story'::"text") AND ("writing_prompt_id" IS NULL) AND ("exam_prompt_id" IS NULL) AND ("presentation_prompt_id" IS NULL) AND ("conversation_prompt_id" IS NULL)) OR (("session_type" = 'writing'::"text") AND ("story_id" IS NULL) AND ("exam_prompt_id" IS NULL) AND ("presentation_prompt_id" IS NULL) AND ("conversation_prompt_id" IS NULL)) OR (("session_type" = 'exam'::"text") AND ("story_id" IS NULL) AND ("writing_prompt_id" IS NULL) AND ("presentation_prompt_id" IS NULL) AND ("conversation_prompt_id" IS NULL)) OR (("session_type" = 'video_summary'::"text") AND ("writing_prompt_id" IS NULL) AND ("exam_prompt_id" IS NULL) AND ("presentation_prompt_id" IS NULL) AND ("conversation_prompt_id" IS NULL)) OR (("session_type" = 'presentation'::"text") AND ("story_id" IS NULL) AND ("writing_prompt_id" IS NULL) AND ("exam_prompt_id" IS NULL) AND ("conversation_prompt_id" IS NULL)) OR (("session_type" = 'conversation'::"text") AND ("story_id" IS NULL) AND ("writing_prompt_id" IS NULL) AND ("exam_prompt_id" IS NULL) AND ("presentation_prompt_id" IS NULL)) OR (("session_type" = 'pronunciation'::"text") AND ("story_id" IS NULL) AND ("writing_prompt_id" IS NULL) AND ("exam_prompt_id" IS NULL) AND ("presentation_prompt_id" IS NULL) AND ("conversation_prompt_id" IS NULL)) OR (("session_type" = 'dialogue'::"text") AND ("story_id" IS NOT NULL) AND ("writing_prompt_id" IS NULL) AND ("exam_prompt_id" IS NULL) AND ("presentation_prompt_id" IS NULL) AND ("conversation_prompt_id" IS NULL)) OR (("session_type" = 'movie_talk'::"text") AND ("story_id" IS NOT NULL) AND ("writing_prompt_id" IS NULL) AND ("exam_prompt_id" IS NULL) AND ("presentation_prompt_id" IS NULL) AND ("conversation_prompt_id" IS NULL)) OR (("session_type" = 'song'::"text") AND ("story_id" IS NOT NULL) AND ("writing_prompt_id" IS NULL) AND ("exam_prompt_id" IS NULL) AND ("presentation_prompt_id" IS NULL) AND ("conversation_prompt_id" IS NULL)))),
    CONSTRAINT "course_sessions_conversation_plan_check" CHECK (("conversation_plan" = ANY (ARRAY['standard'::"text", 'compact'::"text", 'open'::"text"]))),
    CONSTRAINT "course_sessions_round_current_check" CHECK ((("round_current" >= 0) AND ("round_current" <= 7))),
    CONSTRAINT "course_sessions_round_state_check" CHECK (("round_state" = ANY (ARRAY['idle'::"text", 'running'::"text", 'stopped'::"text"]))),
    CONSTRAINT "course_sessions_session_type_check" CHECK (("session_type" = ANY (ARRAY['story'::"text", 'writing'::"text", 'exam'::"text", 'video_summary'::"text", 'presentation'::"text", 'conversation'::"text", 'pronunciation'::"text", 'dialogue'::"text", 'movie_talk'::"text", 'song'::"text"])))
);

ALTER TABLE ONLY "public"."course_sessions" REPLICA IDENTITY FULL;


ALTER TABLE "public"."course_sessions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."course_sessions"."video_playing" IS 'Classroom YouTube: teacher is playing. Students follow during the 90-min window.';



COMMENT ON COLUMN "public"."course_sessions"."video_seconds" IS 'Classroom YouTube: teacher playhead in seconds. Late joiners read this row.';



COMMENT ON COLUMN "public"."course_sessions"."recording_youtube_url" IS 'YouTube URL for the class recording. Shown on the lesson page after the window closes.';



COMMENT ON COLUMN "public"."course_sessions"."class_ended_at" IS 'When the teacher ended class. Null means teaching continues after the scheduled 90-min window until this is set, or until four hours after session_end_time.';



COMMENT ON COLUMN "public"."course_sessions"."song_class_answers" IS 'Slice 63: live teacher answers for song blanks, keyed by blank id. Student attempts stay in song_lyric_attempts.';



CREATE OR REPLACE FUNCTION "public"."get_session_by_token"("p_token" "text") RETURNS SETOF "public"."course_sessions"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT * FROM public.course_sessions
  WHERE session_link_token = p_token
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_session_by_token"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, subscription_status)
  VALUES (NEW.id, NEW.email, 'student-consumer', 'none')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_classroom_student"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'student-classroom'
  );
$$;


ALTER FUNCTION "public"."is_classroom_student"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_enrolled_in_course"("p_course_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE course_id = p_course_id AND student_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_enrolled_in_course"("p_course_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_exam_group_member"("p_group_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.exam_groups g
    WHERE g.id = p_group_id
      AND auth.uid() = ANY (g.member_ids)
  );
$$;


ALTER FUNCTION "public"."is_exam_group_member"("p_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_exam_group_writer"("p_group_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.exam_groups g
    WHERE g.id = p_group_id
      AND g.writer_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_exam_group_writer"("p_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_teacher"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'teacher'
  );
$$;


ALTER FUNCTION "public"."is_teacher"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."teacher_owns_course"("p_course_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = p_course_id AND teacher_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."teacher_owns_course"("p_course_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."teacher_owns_student"("p_student_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.is_teacher() AND EXISTS (
    SELECT 1
    FROM public.course_enrollments ce
    JOIN public.courses c ON c.id = ce.course_id
    WHERE ce.student_id = p_student_id
      AND c.teacher_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."teacher_owns_student"("p_student_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."check_answer_rate_limits" (
    "user_id" "uuid" NOT NULL,
    "request_times" timestamp with time zone[] DEFAULT '{}'::timestamp with time zone[] NOT NULL,
    CONSTRAINT "check_answer_rate_limits_max_requests" CHECK (("cardinality"("request_times") <= 10))
);


ALTER TABLE "public"."check_answer_rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."choral_practice_completions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "story_id" "uuid" NOT NULL,
    "rounds_completed" integer DEFAULT 5 NOT NULL,
    "completed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."choral_practice_completions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comprehension_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "story_id" "uuid" NOT NULL,
    "position" integer NOT NULL,
    "question" "text" NOT NULL,
    "answer" "text",
    "level" "text" DEFAULT 'factual'::"text" NOT NULL,
    CONSTRAINT "comprehension_questions_level_check" CHECK (("level" = ANY (ARRAY['factual'::"text", 'inferential'::"text"])))
);


ALTER TABLE "public"."comprehension_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comprehension_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comprehension_question_id" "uuid" NOT NULL,
    "course_session_id" "uuid",
    "response_text" "text" DEFAULT ''::"text" NOT NULL,
    "revealed_answer" boolean DEFAULT false NOT NULL,
    "revealed_at" timestamp with time zone,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."comprehension_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content_type" "text" NOT NULL,
    "content_id" "uuid" NOT NULL,
    "tag_type" "text" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "coverage_level" "text" DEFAULT 'introduced'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_tags_content_type_check" CHECK (("content_type" = ANY (ARRAY['story'::"text", 'writing_prompt'::"text", 'exam_prompt'::"text", 'presentation_prompt'::"text"]))),
    CONSTRAINT "content_tags_coverage_level_check" CHECK (("coverage_level" = ANY (ARRAY['introduced'::"text", 'reinforced'::"text", 'mastered'::"text"]))),
    CONSTRAINT "content_tags_tag_type_check" CHECK (("tag_type" = ANY (ARRAY['grammar'::"text", 'vocabulary'::"text", 'phonetic'::"text"])))
);


ALTER TABLE "public"."content_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_prompts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "level" "text" NOT NULL,
    "theme" "text",
    "questions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "conversation_prompts_level_check" CHECK (("level" = ANY (ARRAY['pre-intermediate'::"text", 'intermediate'::"text"])))
);

ALTER TABLE ONLY "public"."conversation_prompts" REPLICA IDENTITY FULL;


ALTER TABLE "public"."conversation_prompts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "enrolled_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "display_name" "text" DEFAULT ''::"text" NOT NULL
);


ALTER TABLE "public"."course_enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "level" "text" NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "archived" boolean DEFAULT false NOT NULL,
    "zoom_url" "text",
    CONSTRAINT "courses_level_check" CHECK (("level" = ANY (ARRAY['pre-intermediate'::"text", 'intermediate'::"text"])))
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


COMMENT ON COLUMN "public"."courses"."zoom_url" IS 'Monthly Zoom room URL for this group. Same room for all sessions in the month.';



CREATE TABLE IF NOT EXISTS "public"."dictation_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "story_id" "uuid" NOT NULL,
    "pronunciation_drill_id" "uuid",
    "course_session_id" "uuid",
    "attempt_number" integer DEFAULT 1 NOT NULL,
    "response_text" "text" DEFAULT ''::"text" NOT NULL,
    "accuracy" real,
    "error_analysis" "jsonb",
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "dictation_attempts_accuracy_check" CHECK ((("accuracy" IS NULL) OR (("accuracy" >= (0)::double precision) AND ("accuracy" <= (1)::double precision))))
);


ALTER TABLE "public"."dictation_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exam_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_session_id" "uuid" NOT NULL,
    "group_label" "text" NOT NULL,
    "writer_id" "uuid" NOT NULL,
    "member_ids" "uuid"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "exam_groups_check" CHECK (("writer_id" = ANY ("member_ids"))),
    CONSTRAINT "exam_groups_member_ids_check" CHECK ((("cardinality"("member_ids") >= 2) AND ("cardinality"("member_ids") <= 3)))
);


ALTER TABLE "public"."exam_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exam_prompts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "level" "text" NOT NULL,
    "theme" "text",
    "vocabulary_list" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "fill_in_translation" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "task2_type" "text" NOT NULL,
    "paragraph_restructuring" "jsonb",
    "sentence_correction" "jsonb",
    "translation_sentences" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "time_limit_minutes" integer DEFAULT 35 NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "exam_prompts_level_check" CHECK (("level" = ANY (ARRAY['pre-intermediate'::"text", 'intermediate'::"text"]))),
    CONSTRAINT "exam_prompts_task2_type_check" CHECK (("task2_type" = ANY (ARRAY['paragraph_restructuring'::"text", 'sentence_correction'::"text"]))),
    CONSTRAINT "exam_prompts_time_limit_minutes_check" CHECK ((("time_limit_minutes" > 0) AND ("time_limit_minutes" <= 90)))
);


ALTER TABLE "public"."exam_prompts" OWNER TO "postgres";


COMMENT ON TABLE "public"."exam_prompts" IS 'Group exam prompts. Public URL: /exam?session=. Not stored in stories.';



CREATE TABLE IF NOT EXISTS "public"."expressions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "story_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "spanish_translation" "text" DEFAULT ''::"text" NOT NULL,
    "explanation" "text" DEFAULT ''::"text" NOT NULL,
    "word_ids" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL
);


ALTER TABLE "public"."expressions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."grammar_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "prerequisites" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."grammar_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_exam_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "exam_prompt_id" "uuid" NOT NULL,
    "exam_group_id" "uuid" NOT NULL,
    "course_session_id" "uuid" NOT NULL,
    "task1_answers" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "task2_answers" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "task3_answers" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "submitted_at" timestamp with time zone,
    "status" "text" DEFAULT 'in_progress'::"text" NOT NULL,
    "review_revealed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "group_exam_submissions_status_check" CHECK (("status" = ANY (ARRAY['in_progress'::"text", 'submitted'::"text"])))
);

ALTER TABLE ONLY "public"."group_exam_submissions" REPLICA IDENTITY FULL;


ALTER TABLE "public"."group_exam_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."personal_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "story_id" "uuid" NOT NULL,
    "position" integer NOT NULL,
    "question" "text" NOT NULL
);


ALTER TABLE "public"."personal_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."personal_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "personal_question_id" "uuid" NOT NULL,
    "course_session_id" "uuid",
    "response_text" "text" DEFAULT ''::"text" NOT NULL,
    "response_audio_url" "text",
    "attempt_number" integer DEFAULT 1 NOT NULL,
    "feedback_json" "jsonb",
    "revised_from_id" "uuid",
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."personal_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."phonetic_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."phonetic_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."presentation_prompts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "level" "text" DEFAULT 'intermediate'::"text" NOT NULL,
    "theme" "text",
    "warmup_question" "text",
    "segments" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "presentation_prompts_level_check" CHECK (("level" = 'intermediate'::"text"))
);

ALTER TABLE ONLY "public"."presentation_prompts" REPLICA IDENTITY FULL;


ALTER TABLE "public"."presentation_prompts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."presentation_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "presentation_prompt_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_session_id" "uuid",
    "segment_id" integer NOT NULL,
    "question_id" integer NOT NULL,
    "response_text" "text",
    "revealed_answer" boolean DEFAULT false NOT NULL,
    "revealed_at" timestamp with time zone,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."presentation_responses" REPLICA IDENTITY FULL;


ALTER TABLE "public"."presentation_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."presentation_vocab_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_session_id" "uuid" NOT NULL,
    "segment_id" integer NOT NULL,
    "vocab_english" "text" NOT NULL,
    "note_text" "text" DEFAULT ''::"text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."presentation_vocab_notes" REPLICA IDENTITY FULL;


ALTER TABLE "public"."presentation_vocab_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'student-consumer'::"text" NOT NULL,
    "stripe_customer_id" "text",
    "subscription_status" "text" DEFAULT 'none'::"text" NOT NULL,
    "purchased" boolean DEFAULT false NOT NULL,
    "purchased_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "classroom_level" "text",
    CONSTRAINT "profiles_classroom_level_check" CHECK ((("classroom_level" IS NULL) OR ("classroom_level" = ANY (ARRAY['pre-intermediate'::"text", 'intermediate'::"text"])))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['student-classroom'::"text", 'student-consumer'::"text", 'teacher'::"text"]))),
    CONSTRAINT "profiles_subscription_status_check" CHECK (("subscription_status" = ANY (ARRAY['active'::"text", 'cancelled'::"text", 'paused'::"text", 'none'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."classroom_level" IS 'Teacher-assigned live group. Stripe price seeds this only when null.';



CREATE TABLE IF NOT EXISTS "public"."pronunciation_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "story_id" "uuid",
    "pronunciation_drill_id" "uuid",
    "reference_text" "text" DEFAULT ''::"text" NOT NULL,
    "accuracy_score" real,
    "fluency_score" real,
    "completeness_score" real,
    "weak_sounds" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pronunciation_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pronunciation_drills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "story_id" "uuid" NOT NULL,
    "symbol_legend" "text",
    "focus_type" "text" DEFAULT 'sounds'::"text" NOT NULL,
    "focus_content" "text" DEFAULT ''::"text" NOT NULL,
    "practica_coral_standard" "text" DEFAULT ''::"text" NOT NULL,
    "practica_coral_phonetic" "text" DEFAULT ''::"text" NOT NULL,
    "practica_coral_ipa" "text" DEFAULT ''::"text" NOT NULL,
    "word_notes" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "coral_audio_url" "text" DEFAULT ''::"text" NOT NULL,
    "coral_explanation" "text",
    CONSTRAINT "pronunciation_drills_focus_type_check" CHECK (("focus_type" = ANY (ARRAY['sounds'::"text", 'ed-s-rules'::"text", 'emphasized-syllable'::"text"])))
);


ALTER TABLE "public"."pronunciation_drills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_session_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "attended" boolean DEFAULT false NOT NULL,
    "first_opened_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."session_attendance" OWNER TO "postgres";


COMMENT ON COLUMN "public"."session_attendance"."attended" IS 'True if the student clicked the session link during the 90-min window, or if the teacher marked them present.';



COMMENT ON COLUMN "public"."session_attendance"."first_opened_at" IS 'When the student first opened the session link. Null if the teacher marked attendance and the student never opened.';



CREATE TABLE IF NOT EXISTS "public"."song_lyric_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_session_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "story_id" "uuid" NOT NULL,
    "blank_id" integer NOT NULL,
    "typed_text" "text",
    "is_correct" boolean,
    "submitted_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."song_lyric_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sound_videos" (
    "symbol" "text" NOT NULL,
    "name" "text" NOT NULL,
    "bunny_video_id" "text" DEFAULT ''::"text" NOT NULL,
    "duration_seconds" integer DEFAULT 120 NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "examples" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "course" "text" DEFAULT ''::"text" NOT NULL,
    "ipa" "text" DEFAULT ''::"text" NOT NULL,
    "ipa_aliases" "text"[] DEFAULT '{}'::"text"[] NOT NULL
);


ALTER TABLE "public"."sound_videos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "level" "text" DEFAULT 'pre-intermediate'::"text" NOT NULL,
    "cefr" "text" DEFAULT 'A2/B1'::"text" NOT NULL,
    "body_text" "text" NOT NULL,
    "body_html" "text" DEFAULT ''::"text" NOT NULL,
    "word_count" integer DEFAULT 0 NOT NULL,
    "is_free" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "kind" "text" DEFAULT 'story'::"text" NOT NULL,
    "youtube_url" "text",
    "lyric_blanks" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "spanish_summary" "text",
    "free_write_minutes" integer DEFAULT 5,
    "artist_bio" "text",
    "song_meaning" "text",
    "lyrics_ipa" "jsonb",
    "line_timestamps" "jsonb",
    CONSTRAINT "stories_kind_check" CHECK (("kind" = ANY (ARRAY['story'::"text", 'dialogue'::"text", 'movie_talk'::"text", 'song'::"text", 'video_summary'::"text"]))),
    CONSTRAINT "stories_level_check" CHECK (("level" = ANY (ARRAY['beginner'::"text", 'pre-intermediate'::"text", 'intermediate'::"text"])))
);


ALTER TABLE "public"."stories" OWNER TO "postgres";


COMMENT ON TABLE "public"."stories" IS 'Reader-backed lesson catalog (cuentos, dialogues, Movie Talk, songs, Traducción). Public URL: /lesson/[slug]. There is no lessons table. Writing is writing_prompts. Exams are exam_prompts. Do not rename. See docs/PRD.md Section 4 Catalog map.';



CREATE TABLE IF NOT EXISTS "public"."story_audio" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "story_id" "uuid" NOT NULL,
    "audio_url" "text" NOT NULL,
    "voice" "text" DEFAULT 'edge-tts'::"text" NOT NULL,
    "duration_seconds" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "story_audio_voice_check" CHECK (("voice" = ANY (ARRAY['kyle'::"text", 'edge-tts'::"text", 'openai-tts'::"text"])))
);


ALTER TABLE "public"."story_audio" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_periods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_subscription_id" "text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    CONSTRAINT "subscription_periods_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'cancelled'::"text", 'paused'::"text"])))
);


ALTER TABLE "public"."subscription_periods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "story_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'in-progress'::"text" NOT NULL,
    "comprehension_score" real,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    CONSTRAINT "user_progress_status_check" CHECK (("status" = ANY (ARRAY['not-started'::"text", 'in-progress'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."user_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_topic_evidence" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tag_type" "text" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "source_type" "text" NOT NULL,
    "source_id" "uuid",
    "evidence_detail" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_topic_evidence_source_type_check" CHECK (("source_type" = ANY (ARRAY['reading'::"text", 'word_lookup'::"text", 'comprehension'::"text", 'personal_response'::"text", 'dictation'::"text", 'pronunciation'::"text", 'writing'::"text", 'exam'::"text"]))),
    CONSTRAINT "user_topic_evidence_status_check" CHECK (("status" = ANY (ARRAY['seen'::"text", 'practiced'::"text", 'needs_more_practice'::"text"]))),
    CONSTRAINT "user_topic_evidence_tag_type_check" CHECK (("tag_type" = ANY (ARRAY['grammar'::"text", 'vocabulary'::"text", 'phonetic'::"text"])))
);


ALTER TABLE "public"."user_topic_evidence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_summary_free_writes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "story_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "course_session_id" "uuid",
    "submission_text" "text" DEFAULT ''::"text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "submitted_at" timestamp with time zone,
    "elapsed_seconds" integer DEFAULT 0,
    "word_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."video_summary_free_writes" REPLICA IDENTITY FULL;


ALTER TABLE "public"."video_summary_free_writes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_summary_paragraphs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "story_id" "uuid" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "spanish_text" "text" NOT NULL,
    "english_translation" "text",
    "translation_started_at" timestamp with time zone,
    "translation_completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."video_summary_paragraphs" REPLICA IDENTITY FULL;


ALTER TABLE "public"."video_summary_paragraphs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_summary_teaching_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "story_id" "uuid" NOT NULL,
    "course_session_id" "uuid" NOT NULL,
    "paragraph_position" integer DEFAULT 0 NOT NULL,
    "selected_text" "text" NOT NULL,
    "note" "text" DEFAULT ''::"text" NOT NULL,
    "note_type" "text" DEFAULT 'vocabulary'::"text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "text_side" "text" DEFAULT 'spanish'::"text" NOT NULL,
    CONSTRAINT "video_summary_teaching_notes_note_type_check" CHECK (("note_type" = ANY (ARRAY['vocabulary'::"text", 'grammar'::"text", 'pronunciation'::"text", 'cultural'::"text"]))),
    CONSTRAINT "video_summary_teaching_notes_text_side_check" CHECK (("text_side" = ANY (ARRAY['spanish'::"text", 'english'::"text"])))
);

ALTER TABLE ONLY "public"."video_summary_teaching_notes" REPLICA IDENTITY FULL;


ALTER TABLE "public"."video_summary_teaching_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vocabulary_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."vocabulary_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."word_flag_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "story_id" "uuid" NOT NULL,
    "course_session_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "flag_text" "text" NOT NULL,
    "occurrence_index" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."word_flag_requests" REPLICA IDENTITY FULL;


ALTER TABLE "public"."word_flag_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."word_flags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "story_id" "uuid" NOT NULL,
    "flag_type" "text" NOT NULL,
    "flag_text" "text" NOT NULL,
    "occurrence_index" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "word_flags_flag_type_check" CHECK (("flag_type" = ANY (ARRAY['underline'::"text", 'bold'::"text"])))
);


ALTER TABLE "public"."word_flags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."word_lookups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "word_id" "uuid" NOT NULL,
    "story_id" "uuid" NOT NULL,
    "course_session_id" "uuid",
    "looked_up_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."word_lookups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."words" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "story_id" "uuid" NOT NULL,
    "position" integer NOT NULL,
    "text" "text" NOT NULL,
    "lemma" "text" DEFAULT ''::"text" NOT NULL,
    "spanish_translation" "text" DEFAULT ''::"text" NOT NULL,
    "phonetic_transcription" "text" DEFAULT ''::"text" NOT NULL,
    "part_of_speech" "text" DEFAULT ''::"text" NOT NULL,
    "audio_url" "text" DEFAULT ''::"text" NOT NULL,
    "expression_id" "uuid",
    "is_transparent" boolean DEFAULT false NOT NULL,
    "source" "text" DEFAULT 'body'::"text" NOT NULL,
    CONSTRAINT "words_source_check" CHECK (("source" = ANY (ARRAY['body'::"text", 'bio'::"text"])))
);


ALTER TABLE "public"."words" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."writing_corrections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "writing_submission_id" "uuid" NOT NULL,
    "corrected_text" "text" NOT NULL,
    "correction_diff" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "inline_notes" "jsonb",
    "good_vocabulary" "jsonb",
    "corrected_by" "uuid" NOT NULL,
    "corrected_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."writing_corrections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."writing_prompts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "prompt_text" "text" NOT NULL,
    "writing_time_minutes" integer NOT NULL,
    "level" "text" NOT NULL,
    "structure_lesson" "text",
    "rubric_text" "text",
    "example_paragraph" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "writing_prompts_level_check" CHECK (("level" = ANY (ARRAY['pre-intermediate'::"text", 'intermediate'::"text"]))),
    CONSTRAINT "writing_prompts_writing_time_minutes_check" CHECK (("writing_time_minutes" = ANY (ARRAY[10, 20])))
);


ALTER TABLE "public"."writing_prompts" OWNER TO "postgres";


COMMENT ON TABLE "public"."writing_prompts" IS 'Writing-class prompts. Public URL: /writing?session=. Not stored in stories.';



CREATE TABLE IF NOT EXISTS "public"."writing_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "writing_prompt_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_session_id" "uuid",
    "submission_text" "text" DEFAULT ''::"text" NOT NULL,
    "started_at" timestamp with time zone,
    "submitted_at" timestamp with time zone,
    "elapsed_seconds" integer,
    "word_count" integer DEFAULT 0 NOT NULL,
    "wpm" real,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "writing_submissions_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'submitted'::"text", 'corrected'::"text"])))
);


ALTER TABLE "public"."writing_submissions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."check_answer_rate_limits"
    ADD CONSTRAINT "check_answer_rate_limits_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."choral_practice_completions"
    ADD CONSTRAINT "choral_practice_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."choral_practice_completions"
    ADD CONSTRAINT "choral_practice_completions_user_id_story_id_key" UNIQUE ("user_id", "story_id");



ALTER TABLE ONLY "public"."comprehension_questions"
    ADD CONSTRAINT "comprehension_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comprehension_responses"
    ADD CONSTRAINT "comprehension_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comprehension_responses"
    ADD CONSTRAINT "comprehension_responses_user_id_comprehension_question_id_c_key" UNIQUE ("user_id", "comprehension_question_id", "course_session_id");



ALTER TABLE ONLY "public"."content_tags"
    ADD CONSTRAINT "content_tags_content_type_content_id_tag_type_tag_id_key" UNIQUE ("content_type", "content_id", "tag_type", "tag_id");



ALTER TABLE ONLY "public"."content_tags"
    ADD CONSTRAINT "content_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_prompts"
    ADD CONSTRAINT "conversation_prompts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_course_id_student_id_key" UNIQUE ("course_id", "student_id");



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_sessions"
    ADD CONSTRAINT "course_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_sessions"
    ADD CONSTRAINT "course_sessions_session_link_token_key" UNIQUE ("session_link_token");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dictation_attempts"
    ADD CONSTRAINT "dictation_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exam_groups"
    ADD CONSTRAINT "exam_groups_course_session_id_group_label_key" UNIQUE ("course_session_id", "group_label");



ALTER TABLE ONLY "public"."exam_groups"
    ADD CONSTRAINT "exam_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exam_prompts"
    ADD CONSTRAINT "exam_prompts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expressions"
    ADD CONSTRAINT "expressions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grammar_tags"
    ADD CONSTRAINT "grammar_tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."grammar_tags"
    ADD CONSTRAINT "grammar_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_exam_submissions"
    ADD CONSTRAINT "group_exam_submissions_exam_group_id_key" UNIQUE ("exam_group_id");



ALTER TABLE ONLY "public"."group_exam_submissions"
    ADD CONSTRAINT "group_exam_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personal_questions"
    ADD CONSTRAINT "personal_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personal_responses"
    ADD CONSTRAINT "personal_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phonetic_tags"
    ADD CONSTRAINT "phonetic_tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."phonetic_tags"
    ADD CONSTRAINT "phonetic_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."presentation_prompts"
    ADD CONSTRAINT "presentation_prompts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."presentation_responses"
    ADD CONSTRAINT "presentation_responses_course_session_id_user_id_segment_id_key" UNIQUE ("course_session_id", "user_id", "segment_id", "question_id");



ALTER TABLE ONLY "public"."presentation_responses"
    ADD CONSTRAINT "presentation_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."presentation_vocab_notes"
    ADD CONSTRAINT "presentation_vocab_notes_course_session_id_segment_id_vocab_key" UNIQUE ("course_session_id", "segment_id", "vocab_english");



ALTER TABLE ONLY "public"."presentation_vocab_notes"
    ADD CONSTRAINT "presentation_vocab_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pronunciation_attempts"
    ADD CONSTRAINT "pronunciation_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pronunciation_drills"
    ADD CONSTRAINT "pronunciation_drills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_attendance"
    ADD CONSTRAINT "session_attendance_course_session_id_student_id_key" UNIQUE ("course_session_id", "student_id");



ALTER TABLE ONLY "public"."session_attendance"
    ADD CONSTRAINT "session_attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."song_lyric_attempts"
    ADD CONSTRAINT "song_lyric_attempts_course_session_id_user_id_blank_id_key" UNIQUE ("course_session_id", "user_id", "blank_id");



ALTER TABLE ONLY "public"."song_lyric_attempts"
    ADD CONSTRAINT "song_lyric_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sound_videos"
    ADD CONSTRAINT "sound_videos_pkey" PRIMARY KEY ("symbol");



ALTER TABLE ONLY "public"."stories"
    ADD CONSTRAINT "stories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stories"
    ADD CONSTRAINT "stories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."story_audio"
    ADD CONSTRAINT "story_audio_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_periods"
    ADD CONSTRAINT "subscription_periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_user_id_story_id_key" UNIQUE ("user_id", "story_id");



ALTER TABLE ONLY "public"."user_topic_evidence"
    ADD CONSTRAINT "user_topic_evidence_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_topic_evidence"
    ADD CONSTRAINT "user_topic_evidence_user_id_tag_type_tag_id_key" UNIQUE ("user_id", "tag_type", "tag_id");



ALTER TABLE ONLY "public"."video_summary_free_writes"
    ADD CONSTRAINT "video_summary_free_writes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_summary_paragraphs"
    ADD CONSTRAINT "video_summary_paragraphs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_summary_paragraphs"
    ADD CONSTRAINT "video_summary_paragraphs_story_id_position_key" UNIQUE ("story_id", "position");



ALTER TABLE ONLY "public"."video_summary_teaching_notes"
    ADD CONSTRAINT "video_summary_teaching_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vocabulary_tags"
    ADD CONSTRAINT "vocabulary_tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."vocabulary_tags"
    ADD CONSTRAINT "vocabulary_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."word_flag_requests"
    ADD CONSTRAINT "word_flag_requests_course_session_id_user_id_flag_text_occu_key" UNIQUE ("course_session_id", "user_id", "flag_text", "occurrence_index");



ALTER TABLE ONLY "public"."word_flag_requests"
    ADD CONSTRAINT "word_flag_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."word_flags"
    ADD CONSTRAINT "word_flags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."word_flags"
    ADD CONSTRAINT "word_flags_story_id_flag_text_occurrence_index_flag_type_key" UNIQUE ("story_id", "flag_text", "occurrence_index", "flag_type");



ALTER TABLE ONLY "public"."word_lookups"
    ADD CONSTRAINT "word_lookups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."word_lookups"
    ADD CONSTRAINT "word_lookups_user_id_word_id_key" UNIQUE ("user_id", "word_id");



ALTER TABLE ONLY "public"."words"
    ADD CONSTRAINT "words_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."writing_corrections"
    ADD CONSTRAINT "writing_corrections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."writing_corrections"
    ADD CONSTRAINT "writing_corrections_writing_submission_id_key" UNIQUE ("writing_submission_id");



ALTER TABLE ONLY "public"."writing_prompts"
    ADD CONSTRAINT "writing_prompts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."writing_submissions"
    ADD CONSTRAINT "writing_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."writing_submissions"
    ADD CONSTRAINT "writing_submissions_user_id_course_session_id_key" UNIQUE ("user_id", "course_session_id");



CREATE INDEX "idx_choral_completions_story_id" ON "public"."choral_practice_completions" USING "btree" ("story_id");



CREATE INDEX "idx_choral_completions_user_id" ON "public"."choral_practice_completions" USING "btree" ("user_id");



CREATE INDEX "idx_comp_questions_story_id" ON "public"."comprehension_questions" USING "btree" ("story_id");



CREATE INDEX "idx_comprehension_responses_session_id" ON "public"."comprehension_responses" USING "btree" ("course_session_id");



CREATE INDEX "idx_comprehension_responses_user_id" ON "public"."comprehension_responses" USING "btree" ("user_id");



CREATE INDEX "idx_content_tags_content" ON "public"."content_tags" USING "btree" ("content_type", "content_id");



CREATE INDEX "idx_content_tags_tag" ON "public"."content_tags" USING "btree" ("tag_type", "tag_id");



CREATE INDEX "idx_conversation_prompts_created_by" ON "public"."conversation_prompts" USING "btree" ("created_by");



CREATE INDEX "idx_conversation_prompts_level" ON "public"."conversation_prompts" USING "btree" ("level");



CREATE INDEX "idx_course_enrollments_course_id" ON "public"."course_enrollments" USING "btree" ("course_id");



CREATE INDEX "idx_course_enrollments_student_id" ON "public"."course_enrollments" USING "btree" ("student_id");



CREATE INDEX "idx_course_sessions_conversation_prompt_id" ON "public"."course_sessions" USING "btree" ("conversation_prompt_id");



CREATE INDEX "idx_course_sessions_course_id" ON "public"."course_sessions" USING "btree" ("course_id");



CREATE INDEX "idx_course_sessions_exam_prompt_id" ON "public"."course_sessions" USING "btree" ("exam_prompt_id");



CREATE INDEX "idx_course_sessions_presentation_prompt_id" ON "public"."course_sessions" USING "btree" ("presentation_prompt_id");



CREATE INDEX "idx_course_sessions_token" ON "public"."course_sessions" USING "btree" ("session_link_token");



CREATE INDEX "idx_course_sessions_writing_prompt_id" ON "public"."course_sessions" USING "btree" ("writing_prompt_id");



CREATE INDEX "idx_courses_teacher_id" ON "public"."courses" USING "btree" ("teacher_id");



CREATE INDEX "idx_dictation_attempts_story_id" ON "public"."dictation_attempts" USING "btree" ("story_id");



CREATE INDEX "idx_dictation_attempts_user_id" ON "public"."dictation_attempts" USING "btree" ("user_id");



CREATE INDEX "idx_exam_groups_session_id" ON "public"."exam_groups" USING "btree" ("course_session_id");



CREATE INDEX "idx_exam_groups_writer_id" ON "public"."exam_groups" USING "btree" ("writer_id");



CREATE INDEX "idx_exam_prompts_created_by" ON "public"."exam_prompts" USING "btree" ("created_by");



CREATE INDEX "idx_exam_prompts_level" ON "public"."exam_prompts" USING "btree" ("level");



CREATE INDEX "idx_expressions_story_id" ON "public"."expressions" USING "btree" ("story_id");



CREATE INDEX "idx_group_exam_submissions_prompt_id" ON "public"."group_exam_submissions" USING "btree" ("exam_prompt_id");



CREATE INDEX "idx_group_exam_submissions_session_id" ON "public"."group_exam_submissions" USING "btree" ("course_session_id");



CREATE INDEX "idx_personal_questions_story_id" ON "public"."personal_questions" USING "btree" ("story_id");



CREATE INDEX "idx_personal_responses_question_id" ON "public"."personal_responses" USING "btree" ("personal_question_id");



CREATE INDEX "idx_personal_responses_user_id" ON "public"."personal_responses" USING "btree" ("user_id");



CREATE INDEX "idx_presentation_prompts_created_by" ON "public"."presentation_prompts" USING "btree" ("created_by");



CREATE INDEX "idx_presentation_prompts_level" ON "public"."presentation_prompts" USING "btree" ("level");



CREATE INDEX "idx_presentation_responses_session" ON "public"."presentation_responses" USING "btree" ("course_session_id");



CREATE INDEX "idx_presentation_responses_user" ON "public"."presentation_responses" USING "btree" ("user_id");



CREATE INDEX "idx_presentation_vocab_notes_session" ON "public"."presentation_vocab_notes" USING "btree" ("course_session_id");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_pronunciation_attempts_story_id" ON "public"."pronunciation_attempts" USING "btree" ("story_id");



CREATE INDEX "idx_pronunciation_attempts_user_id" ON "public"."pronunciation_attempts" USING "btree" ("user_id");



CREATE INDEX "idx_session_attendance_session_id" ON "public"."session_attendance" USING "btree" ("course_session_id");



CREATE INDEX "idx_song_lyric_attempts_session_user" ON "public"."song_lyric_attempts" USING "btree" ("course_session_id", "user_id");



CREATE UNIQUE INDEX "idx_subscription_periods_stripe_sub" ON "public"."subscription_periods" USING "btree" ("stripe_subscription_id");



CREATE INDEX "idx_subscription_periods_user_id" ON "public"."subscription_periods" USING "btree" ("user_id");



CREATE INDEX "idx_user_progress_story_id" ON "public"."user_progress" USING "btree" ("story_id");



CREATE INDEX "idx_user_progress_user_id" ON "public"."user_progress" USING "btree" ("user_id");



CREATE INDEX "idx_user_topic_evidence_status" ON "public"."user_topic_evidence" USING "btree" ("user_id", "status");



CREATE INDEX "idx_user_topic_evidence_user_id" ON "public"."user_topic_evidence" USING "btree" ("user_id");



CREATE INDEX "idx_vsfw_session" ON "public"."video_summary_free_writes" USING "btree" ("course_session_id");



CREATE INDEX "idx_vsfw_story" ON "public"."video_summary_free_writes" USING "btree" ("story_id");



CREATE INDEX "idx_vsfw_user" ON "public"."video_summary_free_writes" USING "btree" ("user_id");



CREATE INDEX "idx_vsp_position" ON "public"."video_summary_paragraphs" USING "btree" ("story_id", "position");



CREATE INDEX "idx_vsp_story" ON "public"."video_summary_paragraphs" USING "btree" ("story_id");



CREATE INDEX "idx_vstn_paragraph" ON "public"."video_summary_teaching_notes" USING "btree" ("course_session_id", "paragraph_position");



CREATE INDEX "idx_vstn_session" ON "public"."video_summary_teaching_notes" USING "btree" ("course_session_id");



CREATE INDEX "idx_wfr_anchor" ON "public"."word_flag_requests" USING "btree" ("course_session_id", "flag_text", "occurrence_index");



CREATE INDEX "idx_wfr_session" ON "public"."word_flag_requests" USING "btree" ("course_session_id");



CREATE INDEX "idx_word_flags_story" ON "public"."word_flags" USING "btree" ("story_id");



CREATE INDEX "idx_word_lookups_session_id" ON "public"."word_lookups" USING "btree" ("course_session_id");



CREATE INDEX "idx_word_lookups_story_id" ON "public"."word_lookups" USING "btree" ("story_id");



CREATE INDEX "idx_word_lookups_user_id" ON "public"."word_lookups" USING "btree" ("user_id");



CREATE INDEX "idx_words_expression_id" ON "public"."words" USING "btree" ("expression_id");



CREATE INDEX "idx_words_story_id" ON "public"."words" USING "btree" ("story_id");



CREATE INDEX "idx_writing_corrections_submission_id" ON "public"."writing_corrections" USING "btree" ("writing_submission_id");



CREATE INDEX "idx_writing_prompts_created_by" ON "public"."writing_prompts" USING "btree" ("created_by");



CREATE INDEX "idx_writing_prompts_level" ON "public"."writing_prompts" USING "btree" ("level");



CREATE INDEX "idx_writing_submissions_prompt_id" ON "public"."writing_submissions" USING "btree" ("writing_prompt_id");



CREATE INDEX "idx_writing_submissions_session_id" ON "public"."writing_submissions" USING "btree" ("course_session_id");



CREATE INDEX "idx_writing_submissions_user_id" ON "public"."writing_submissions" USING "btree" ("user_id");



CREATE UNIQUE INDEX "sound_videos_ipa_key" ON "public"."sound_videos" USING "btree" ("ipa") WHERE ("ipa" <> ''::"text");



ALTER TABLE ONLY "public"."check_answer_rate_limits"
    ADD CONSTRAINT "check_answer_rate_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."choral_practice_completions"
    ADD CONSTRAINT "choral_practice_completions_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."choral_practice_completions"
    ADD CONSTRAINT "choral_practice_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comprehension_questions"
    ADD CONSTRAINT "comprehension_questions_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comprehension_responses"
    ADD CONSTRAINT "comprehension_responses_comprehension_question_id_fkey" FOREIGN KEY ("comprehension_question_id") REFERENCES "public"."comprehension_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comprehension_responses"
    ADD CONSTRAINT "comprehension_responses_course_session_id_fkey" FOREIGN KEY ("course_session_id") REFERENCES "public"."course_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."comprehension_responses"
    ADD CONSTRAINT "comprehension_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_prompts"
    ADD CONSTRAINT "conversation_prompts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_sessions"
    ADD CONSTRAINT "course_sessions_conversation_prompt_id_fkey" FOREIGN KEY ("conversation_prompt_id") REFERENCES "public"."conversation_prompts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."course_sessions"
    ADD CONSTRAINT "course_sessions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_sessions"
    ADD CONSTRAINT "course_sessions_exam_prompt_id_fkey" FOREIGN KEY ("exam_prompt_id") REFERENCES "public"."exam_prompts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."course_sessions"
    ADD CONSTRAINT "course_sessions_presentation_prompt_id_fkey" FOREIGN KEY ("presentation_prompt_id") REFERENCES "public"."presentation_prompts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."course_sessions"
    ADD CONSTRAINT "course_sessions_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id");



ALTER TABLE ONLY "public"."course_sessions"
    ADD CONSTRAINT "course_sessions_writing_prompt_id_fkey" FOREIGN KEY ("writing_prompt_id") REFERENCES "public"."writing_prompts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."dictation_attempts"
    ADD CONSTRAINT "dictation_attempts_course_session_id_fkey" FOREIGN KEY ("course_session_id") REFERENCES "public"."course_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dictation_attempts"
    ADD CONSTRAINT "dictation_attempts_pronunciation_drill_id_fkey" FOREIGN KEY ("pronunciation_drill_id") REFERENCES "public"."pronunciation_drills"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dictation_attempts"
    ADD CONSTRAINT "dictation_attempts_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dictation_attempts"
    ADD CONSTRAINT "dictation_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_groups"
    ADD CONSTRAINT "exam_groups_course_session_id_fkey" FOREIGN KEY ("course_session_id") REFERENCES "public"."course_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_groups"
    ADD CONSTRAINT "exam_groups_writer_id_fkey" FOREIGN KEY ("writer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."exam_prompts"
    ADD CONSTRAINT "exam_prompts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."expressions"
    ADD CONSTRAINT "expressions_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_exam_submissions"
    ADD CONSTRAINT "group_exam_submissions_course_session_id_fkey" FOREIGN KEY ("course_session_id") REFERENCES "public"."course_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_exam_submissions"
    ADD CONSTRAINT "group_exam_submissions_exam_group_id_fkey" FOREIGN KEY ("exam_group_id") REFERENCES "public"."exam_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_exam_submissions"
    ADD CONSTRAINT "group_exam_submissions_exam_prompt_id_fkey" FOREIGN KEY ("exam_prompt_id") REFERENCES "public"."exam_prompts"("id");



ALTER TABLE ONLY "public"."personal_questions"
    ADD CONSTRAINT "personal_questions_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personal_responses"
    ADD CONSTRAINT "personal_responses_course_session_id_fkey" FOREIGN KEY ("course_session_id") REFERENCES "public"."course_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."personal_responses"
    ADD CONSTRAINT "personal_responses_personal_question_id_fkey" FOREIGN KEY ("personal_question_id") REFERENCES "public"."personal_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personal_responses"
    ADD CONSTRAINT "personal_responses_revised_from_id_fkey" FOREIGN KEY ("revised_from_id") REFERENCES "public"."personal_responses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."personal_responses"
    ADD CONSTRAINT "personal_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."presentation_prompts"
    ADD CONSTRAINT "presentation_prompts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."presentation_responses"
    ADD CONSTRAINT "presentation_responses_course_session_id_fkey" FOREIGN KEY ("course_session_id") REFERENCES "public"."course_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."presentation_responses"
    ADD CONSTRAINT "presentation_responses_presentation_prompt_id_fkey" FOREIGN KEY ("presentation_prompt_id") REFERENCES "public"."presentation_prompts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."presentation_responses"
    ADD CONSTRAINT "presentation_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."presentation_vocab_notes"
    ADD CONSTRAINT "presentation_vocab_notes_course_session_id_fkey" FOREIGN KEY ("course_session_id") REFERENCES "public"."course_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."presentation_vocab_notes"
    ADD CONSTRAINT "presentation_vocab_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pronunciation_attempts"
    ADD CONSTRAINT "pronunciation_attempts_pronunciation_drill_id_fkey" FOREIGN KEY ("pronunciation_drill_id") REFERENCES "public"."pronunciation_drills"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pronunciation_attempts"
    ADD CONSTRAINT "pronunciation_attempts_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pronunciation_attempts"
    ADD CONSTRAINT "pronunciation_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pronunciation_drills"
    ADD CONSTRAINT "pronunciation_drills_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_attendance"
    ADD CONSTRAINT "session_attendance_course_session_id_fkey" FOREIGN KEY ("course_session_id") REFERENCES "public"."course_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_attendance"
    ADD CONSTRAINT "session_attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."song_lyric_attempts"
    ADD CONSTRAINT "song_lyric_attempts_course_session_id_fkey" FOREIGN KEY ("course_session_id") REFERENCES "public"."course_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."song_lyric_attempts"
    ADD CONSTRAINT "song_lyric_attempts_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."song_lyric_attempts"
    ADD CONSTRAINT "song_lyric_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."story_audio"
    ADD CONSTRAINT "story_audio_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_periods"
    ADD CONSTRAINT "subscription_periods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_topic_evidence"
    ADD CONSTRAINT "user_topic_evidence_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_summary_free_writes"
    ADD CONSTRAINT "video_summary_free_writes_course_session_id_fkey" FOREIGN KEY ("course_session_id") REFERENCES "public"."course_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."video_summary_free_writes"
    ADD CONSTRAINT "video_summary_free_writes_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_summary_free_writes"
    ADD CONSTRAINT "video_summary_free_writes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_summary_paragraphs"
    ADD CONSTRAINT "video_summary_paragraphs_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_summary_teaching_notes"
    ADD CONSTRAINT "video_summary_teaching_notes_course_session_id_fkey" FOREIGN KEY ("course_session_id") REFERENCES "public"."course_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_summary_teaching_notes"
    ADD CONSTRAINT "video_summary_teaching_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_summary_teaching_notes"
    ADD CONSTRAINT "video_summary_teaching_notes_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."word_flag_requests"
    ADD CONSTRAINT "word_flag_requests_course_session_id_fkey" FOREIGN KEY ("course_session_id") REFERENCES "public"."course_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."word_flag_requests"
    ADD CONSTRAINT "word_flag_requests_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."word_flag_requests"
    ADD CONSTRAINT "word_flag_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."word_flags"
    ADD CONSTRAINT "word_flags_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."word_lookups"
    ADD CONSTRAINT "word_lookups_course_session_id_fkey" FOREIGN KEY ("course_session_id") REFERENCES "public"."course_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."word_lookups"
    ADD CONSTRAINT "word_lookups_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."word_lookups"
    ADD CONSTRAINT "word_lookups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."word_lookups"
    ADD CONSTRAINT "word_lookups_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."words"
    ADD CONSTRAINT "words_expression_id_fkey" FOREIGN KEY ("expression_id") REFERENCES "public"."expressions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."words"
    ADD CONSTRAINT "words_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."writing_corrections"
    ADD CONSTRAINT "writing_corrections_corrected_by_fkey" FOREIGN KEY ("corrected_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."writing_corrections"
    ADD CONSTRAINT "writing_corrections_writing_submission_id_fkey" FOREIGN KEY ("writing_submission_id") REFERENCES "public"."writing_submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."writing_prompts"
    ADD CONSTRAINT "writing_prompts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."writing_submissions"
    ADD CONSTRAINT "writing_submissions_course_session_id_fkey" FOREIGN KEY ("course_session_id") REFERENCES "public"."course_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."writing_submissions"
    ADD CONSTRAINT "writing_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."writing_submissions"
    ADD CONSTRAINT "writing_submissions_writing_prompt_id_fkey" FOREIGN KEY ("writing_prompt_id") REFERENCES "public"."writing_prompts"("id");



CREATE POLICY "Anyone can read content tags" ON "public"."content_tags" FOR SELECT USING (true);



CREATE POLICY "Anyone can read grammar tags" ON "public"."grammar_tags" FOR SELECT USING (true);



CREATE POLICY "Anyone can read phonetic tags" ON "public"."phonetic_tags" FOR SELECT USING (true);



CREATE POLICY "Anyone can read vocabulary tags" ON "public"."vocabulary_tags" FOR SELECT USING (true);



CREATE POLICY "Assigned readers can read audio" ON "public"."story_audio" FOR SELECT USING ("public"."can_read_story"("story_id"));



CREATE POLICY "Assigned readers can read comprehension questions" ON "public"."comprehension_questions" FOR SELECT USING ("public"."can_read_story"("story_id"));



CREATE POLICY "Assigned readers can read expressions" ON "public"."expressions" FOR SELECT USING ("public"."can_read_story"("story_id"));



CREATE POLICY "Assigned readers can read personal questions" ON "public"."personal_questions" FOR SELECT USING ("public"."can_read_story"("story_id"));



CREATE POLICY "Assigned readers can read pronunciation drills" ON "public"."pronunciation_drills" FOR SELECT USING ("public"."can_read_story"("story_id"));



CREATE POLICY "Assigned readers can read stories" ON "public"."stories" FOR SELECT USING ("public"."can_read_story"("id"));



CREATE POLICY "Assigned readers can read words" ON "public"."words" FOR SELECT USING ("public"."can_read_story"("story_id"));



CREATE POLICY "Classroom students can self-enroll" ON "public"."course_enrollments" FOR INSERT WITH CHECK ((("student_id" = "auth"."uid"()) AND "public"."is_classroom_student"()));



CREATE POLICY "Enrolled students can read course sessions" ON "public"."course_sessions" FOR SELECT USING ("public"."is_enrolled_in_course"("course_id"));



CREATE POLICY "Enrolled students can read their courses" ON "public"."courses" FOR SELECT USING ("public"."is_enrolled_in_course"("id"));



CREATE POLICY "Public can read audio for free stories" ON "public"."story_audio" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."stories"
  WHERE (("stories"."id" = "story_audio"."story_id") AND ("stories"."is_free" = true)))));



CREATE POLICY "Public can read comprehension questions for free stories" ON "public"."comprehension_questions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."stories"
  WHERE (("stories"."id" = "comprehension_questions"."story_id") AND ("stories"."is_free" = true)))));



CREATE POLICY "Public can read expressions for free stories" ON "public"."expressions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."stories"
  WHERE (("stories"."id" = "expressions"."story_id") AND ("stories"."is_free" = true)))));



CREATE POLICY "Public can read free stories" ON "public"."stories" FOR SELECT USING (("is_free" = true));



CREATE POLICY "Public can read personal questions for free stories" ON "public"."personal_questions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."stories"
  WHERE (("stories"."id" = "personal_questions"."story_id") AND ("stories"."is_free" = true)))));



CREATE POLICY "Public can read pronunciation drills for free stories" ON "public"."pronunciation_drills" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."stories"
  WHERE (("stories"."id" = "pronunciation_drills"."story_id") AND ("stories"."is_free" = true)))));



CREATE POLICY "Public can read sound videos" ON "public"."sound_videos" FOR SELECT USING (true);



CREATE POLICY "Public can read words for free stories" ON "public"."words" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."stories"
  WHERE (("stories"."id" = "words"."story_id") AND ("stories"."is_free" = true)))));



CREATE POLICY "Students can insert own attendance" ON "public"."session_attendance" FOR INSERT WITH CHECK (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can insert own choral completions" ON "public"."choral_practice_completions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Students can insert own dictation attempts" ON "public"."dictation_attempts" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Students can insert own personal responses" ON "public"."personal_responses" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Students can insert own progress" ON "public"."user_progress" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Students can insert own pronunciation attempts" ON "public"."pronunciation_attempts" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Students can insert own song lyric attempts" ON "public"."song_lyric_attempts" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."id" = "song_lyric_attempts"."course_session_id") AND "public"."is_enrolled_in_course"("cs"."course_id"))))));



CREATE POLICY "Students can insert own topic evidence" ON "public"."user_topic_evidence" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Students can insert own word lookups" ON "public"."word_lookups" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND (NOT "public"."is_teacher"())));



CREATE POLICY "Students can insert own writing submissions" ON "public"."writing_submissions" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND (NOT "public"."is_teacher"()) AND (("course_session_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."id" = "writing_submissions"."course_session_id") AND ("cs"."writing_prompt_id" = "writing_submissions"."writing_prompt_id") AND "public"."is_enrolled_in_course"("cs"."course_id")))))));



CREATE POLICY "Students can manage own comprehension responses" ON "public"."comprehension_responses" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Students can manage own presentation responses" ON "public"."presentation_responses" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Students can read assigned conversation prompts" ON "public"."conversation_prompts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."conversation_prompt_id" = "conversation_prompts"."id") AND "public"."is_enrolled_in_course"("cs"."course_id")))));



CREATE POLICY "Students can read assigned exam prompts" ON "public"."exam_prompts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."exam_prompt_id" = "exam_prompts"."id") AND "public"."is_enrolled_in_course"("cs"."course_id")))));



CREATE POLICY "Students can read assigned presentation prompts" ON "public"."presentation_prompts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."presentation_prompt_id" = "presentation_prompts"."id") AND "public"."is_enrolled_in_course"("cs"."course_id")))));



CREATE POLICY "Students can read assigned writing prompts" ON "public"."writing_prompts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."writing_prompt_id" = "writing_prompts"."id") AND "public"."is_enrolled_in_course"("cs"."course_id")))));



CREATE POLICY "Students can read own attendance" ON "public"."session_attendance" FOR SELECT USING (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can read own choral completions" ON "public"."choral_practice_completions" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Students can read own dictation attempts" ON "public"."dictation_attempts" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Students can read own enrollments" ON "public"."course_enrollments" FOR SELECT USING (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can read own exam groups" ON "public"."exam_groups" FOR SELECT USING (("auth"."uid"() = ANY ("member_ids")));



CREATE POLICY "Students can read own group exam submissions" ON "public"."group_exam_submissions" FOR SELECT USING ("public"."is_exam_group_member"("exam_group_id"));



CREATE POLICY "Students can read own personal responses" ON "public"."personal_responses" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Students can read own progress" ON "public"."user_progress" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Students can read own pronunciation attempts" ON "public"."pronunciation_attempts" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Students can read own song lyric attempts" ON "public"."song_lyric_attempts" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Students can read own topic evidence" ON "public"."user_topic_evidence" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Students can read own word lookups" ON "public"."word_lookups" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Students can read own writing corrections" ON "public"."writing_corrections" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."writing_submissions" "ws"
  WHERE (("ws"."id" = "writing_corrections"."writing_submission_id") AND ("ws"."user_id" = "auth"."uid"())))));



CREATE POLICY "Students can read own writing submissions" ON "public"."writing_submissions" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Students can read presentation vocab notes" ON "public"."presentation_vocab_notes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."id" = "presentation_vocab_notes"."course_session_id") AND "public"."is_enrolled_in_course"("cs"."course_id")))));



CREATE POLICY "Students can read teacher presentation answers" ON "public"."presentation_responses" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."course_sessions" "cs"
     JOIN "public"."courses" "c" ON (("c"."id" = "cs"."course_id")))
  WHERE (("cs"."id" = "presentation_responses"."course_session_id") AND "public"."is_enrolled_in_course"("cs"."course_id") AND ("c"."teacher_id" = "presentation_responses"."user_id")))));



CREATE POLICY "Students can update own attendance" ON "public"."session_attendance" FOR UPDATE USING (("student_id" = "auth"."uid"())) WITH CHECK (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can update own choral completions" ON "public"."choral_practice_completions" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Students can update own draft writing submissions" ON "public"."writing_submissions" FOR UPDATE USING ((("user_id" = "auth"."uid"()) AND ("status" = 'draft'::"text"))) WITH CHECK ((("user_id" = "auth"."uid"()) AND ("status" = ANY (ARRAY['draft'::"text", 'submitted'::"text"]))));



CREATE POLICY "Students can update own progress" ON "public"."user_progress" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Students can update own song lyric attempts" ON "public"."song_lyric_attempts" FOR UPDATE USING ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."id" = "song_lyric_attempts"."course_session_id") AND "public"."is_enrolled_in_course"("cs"."course_id")))))) WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."id" = "song_lyric_attempts"."course_session_id") AND "public"."is_enrolled_in_course"("cs"."course_id"))))));



CREATE POLICY "Students can update own topic evidence" ON "public"."user_topic_evidence" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Teachers can insert attendance on own courses" ON "public"."session_attendance" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."id" = "session_attendance"."course_session_id") AND "public"."teacher_owns_course"("cs"."course_id")))));



CREATE POLICY "Teachers can manage conversation prompts" ON "public"."conversation_prompts" USING ("public"."is_teacher"()) WITH CHECK (("public"."is_teacher"() AND ("created_by" = "auth"."uid"())));



CREATE POLICY "Teachers can manage corrections on own courses" ON "public"."writing_corrections" USING ((EXISTS ( SELECT 1
   FROM ("public"."writing_submissions" "ws"
     JOIN "public"."course_sessions" "cs" ON (("cs"."id" = "ws"."course_session_id")))
  WHERE (("ws"."id" = "writing_corrections"."writing_submission_id") AND "public"."teacher_owns_course"("cs"."course_id"))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."writing_submissions" "ws"
     JOIN "public"."course_sessions" "cs" ON (("cs"."id" = "ws"."course_session_id")))
  WHERE (("ws"."id" = "writing_corrections"."writing_submission_id") AND "public"."teacher_owns_course"("cs"."course_id")))) AND ("corrected_by" = "auth"."uid"())));



CREATE POLICY "Teachers can manage enrollments on own courses" ON "public"."course_enrollments" USING ("public"."teacher_owns_course"("course_id")) WITH CHECK ("public"."teacher_owns_course"("course_id"));



CREATE POLICY "Teachers can manage exam groups on own courses" ON "public"."exam_groups" USING ((EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."id" = "exam_groups"."course_session_id") AND "public"."teacher_owns_course"("cs"."course_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."id" = "exam_groups"."course_session_id") AND "public"."teacher_owns_course"("cs"."course_id")))));



CREATE POLICY "Teachers can manage exam prompts" ON "public"."exam_prompts" USING ("public"."is_teacher"()) WITH CHECK (("public"."is_teacher"() AND ("created_by" = "auth"."uid"())));



CREATE POLICY "Teachers can manage own courses" ON "public"."courses" USING (("teacher_id" = "auth"."uid"())) WITH CHECK (("teacher_id" = "auth"."uid"()));



CREATE POLICY "Teachers can manage presentation prompts" ON "public"."presentation_prompts" USING ("public"."is_teacher"()) WITH CHECK (("public"."is_teacher"() AND ("created_by" = "auth"."uid"())));



CREATE POLICY "Teachers can manage presentation vocab notes" ON "public"."presentation_vocab_notes" USING ((EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."id" = "presentation_vocab_notes"."course_session_id") AND "public"."teacher_owns_course"("cs"."course_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."id" = "presentation_vocab_notes"."course_session_id") AND "public"."teacher_owns_course"("cs"."course_id")))));



CREATE POLICY "Teachers can manage sessions on own courses" ON "public"."course_sessions" USING ("public"."teacher_owns_course"("course_id")) WITH CHECK ("public"."teacher_owns_course"("course_id"));



CREATE POLICY "Teachers can manage writing prompts" ON "public"."writing_prompts" USING ("public"."is_teacher"()) WITH CHECK (("public"."is_teacher"() AND ("created_by" = "auth"."uid"())));



CREATE POLICY "Teachers can read attendance on own courses" ON "public"."session_attendance" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."id" = "session_attendance"."course_session_id") AND "public"."teacher_owns_course"("cs"."course_id")))));



CREATE POLICY "Teachers can read dictation attempts for own students" ON "public"."dictation_attempts" FOR SELECT USING ("public"."teacher_owns_student"("user_id"));



CREATE POLICY "Teachers can read exam submissions on own courses" ON "public"."group_exam_submissions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."id" = "group_exam_submissions"."course_session_id") AND "public"."teacher_owns_course"("cs"."course_id")))));



CREATE POLICY "Teachers can read lookups on own courses" ON "public"."word_lookups" FOR SELECT USING (("public"."is_teacher"() AND ((("course_session_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."id" = "word_lookups"."course_session_id") AND "public"."teacher_owns_course"("cs"."course_id"))))) OR (EXISTS ( SELECT 1
   FROM ("public"."course_enrollments" "ce"
     JOIN "public"."courses" "c" ON (("c"."id" = "ce"."course_id")))
  WHERE (("ce"."student_id" = "word_lookups"."user_id") AND ("c"."teacher_id" = "auth"."uid"())))))));



CREATE POLICY "Teachers can read personal responses for own students" ON "public"."personal_responses" FOR SELECT USING ("public"."teacher_owns_student"("user_id"));



CREATE POLICY "Teachers can read presentation responses on own courses" ON "public"."presentation_responses" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."id" = "presentation_responses"."course_session_id") AND "public"."teacher_owns_course"("cs"."course_id")))));



CREATE POLICY "Teachers can read progress for own students" ON "public"."user_progress" FOR SELECT USING ("public"."teacher_owns_student"("user_id"));



CREATE POLICY "Teachers can read pronunciation attempts for own students" ON "public"."pronunciation_attempts" FOR SELECT USING ("public"."teacher_owns_student"("user_id"));



CREATE POLICY "Teachers can read responses on own courses" ON "public"."comprehension_responses" FOR SELECT USING ((("course_session_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."id" = "comprehension_responses"."course_session_id") AND "public"."teacher_owns_course"("cs"."course_id"))))));



CREATE POLICY "Teachers can read song lyric attempts on own courses" ON "public"."song_lyric_attempts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."id" = "song_lyric_attempts"."course_session_id") AND "public"."teacher_owns_course"("cs"."course_id")))));



CREATE POLICY "Teachers can read topic evidence for own students" ON "public"."user_topic_evidence" FOR SELECT USING ("public"."teacher_owns_student"("user_id"));



CREATE POLICY "Teachers can read writing submissions on own courses" ON "public"."writing_submissions" FOR SELECT USING ((("course_session_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."id" = "writing_submissions"."course_session_id") AND "public"."teacher_owns_course"("cs"."course_id"))))));



CREATE POLICY "Teachers can update attendance on own courses" ON "public"."session_attendance" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."id" = "session_attendance"."course_session_id") AND "public"."teacher_owns_course"("cs"."course_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."id" = "session_attendance"."course_session_id") AND "public"."teacher_owns_course"("cs"."course_id")))));



CREATE POLICY "Teachers can update exam submissions on own courses" ON "public"."group_exam_submissions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."id" = "group_exam_submissions"."course_session_id") AND "public"."teacher_owns_course"("cs"."course_id")))));



CREATE POLICY "Teachers can update writing submissions on own courses" ON "public"."writing_submissions" FOR UPDATE USING ((("course_session_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."id" = "writing_submissions"."course_session_id") AND "public"."teacher_owns_course"("cs"."course_id"))))));



CREATE POLICY "Users can read own profile" ON "public"."profiles" FOR SELECT USING ((("id" = "auth"."uid"()) OR "public"."is_teacher"()));



CREATE POLICY "Users can read own subscription periods" ON "public"."subscription_periods" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_teacher"()));



CREATE POLICY "Writers can insert group exam submissions" ON "public"."group_exam_submissions" FOR INSERT WITH CHECK (("public"."is_exam_group_writer"("exam_group_id") AND (NOT "public"."is_teacher"()) AND (EXISTS ( SELECT 1
   FROM "public"."course_sessions" "cs"
  WHERE (("cs"."id" = "group_exam_submissions"."course_session_id") AND ("cs"."exam_prompt_id" = "group_exam_submissions"."exam_prompt_id") AND "public"."is_enrolled_in_course"("cs"."course_id"))))));



CREATE POLICY "Writers can update in-progress group exam submissions" ON "public"."group_exam_submissions" FOR UPDATE USING (("public"."is_exam_group_writer"("exam_group_id") AND ("status" = 'in_progress'::"text"))) WITH CHECK (("public"."is_exam_group_writer"("exam_group_id") AND ("status" = ANY (ARRAY['in_progress'::"text", 'submitted'::"text"]))));



ALTER TABLE "public"."check_answer_rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."choral_practice_completions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comprehension_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comprehension_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."content_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_prompts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_enrollments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dictation_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exam_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exam_prompts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expressions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."grammar_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_exam_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."personal_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."personal_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."phonetic_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."presentation_prompts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."presentation_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."presentation_vocab_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pronunciation_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pronunciation_drills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."song_lyric_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sound_videos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."story_audio" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_periods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_topic_evidence" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_summary_free_writes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_summary_paragraphs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_summary_teaching_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vocabulary_tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vsfw_student_own" ON "public"."video_summary_free_writes" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "vsfw_teacher_read" ON "public"."video_summary_free_writes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['teacher'::"text", 'admin'::"text"]))))));



CREATE POLICY "vsp_read_all" ON "public"."video_summary_paragraphs" FOR SELECT USING (true);



CREATE POLICY "vsp_write_teacher" ON "public"."video_summary_paragraphs" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['teacher'::"text", 'admin'::"text"]))))));



CREATE POLICY "vstn_read_all" ON "public"."video_summary_teaching_notes" FOR SELECT USING (true);



CREATE POLICY "vstn_write_teacher" ON "public"."video_summary_teaching_notes" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['teacher'::"text", 'admin'::"text"]))))));



CREATE POLICY "wf_teacher_all" ON "public"."word_flags" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['teacher'::"text", 'admin'::"text"]))))));



CREATE POLICY "wfr_student_insert_own" ON "public"."word_flag_requests" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "wfr_student_read_own" ON "public"."word_flag_requests" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "wfr_teacher_delete" ON "public"."word_flag_requests" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."course_sessions" "cs"
     JOIN "public"."courses" "c" ON (("c"."id" = "cs"."course_id")))
  WHERE (("cs"."id" = "word_flag_requests"."course_session_id") AND ("c"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "wfr_teacher_select" ON "public"."word_flag_requests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."course_sessions" "cs"
     JOIN "public"."courses" "c" ON (("c"."id" = "cs"."course_id")))
  WHERE (("cs"."id" = "word_flag_requests"."course_session_id") AND ("c"."teacher_id" = "auth"."uid"())))));



ALTER TABLE "public"."word_flag_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."word_flags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."word_lookups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."words" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."writing_corrections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."writing_prompts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."writing_submissions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."conversation_prompts";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."course_sessions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."group_exam_submissions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."presentation_prompts";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."presentation_responses";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."presentation_vocab_notes";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."video_summary_paragraphs";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."video_summary_teaching_notes";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."word_flag_requests";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."can_read_story"("p_story_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_read_story"("p_story_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_read_story"("p_story_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."consume_check_answer_request"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."consume_check_answer_request"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."course_sessions" TO "anon";
GRANT ALL ON TABLE "public"."course_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."course_sessions" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_session_by_token"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_session_by_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_session_by_token"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_classroom_student"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_classroom_student"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_classroom_student"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_enrolled_in_course"("p_course_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_enrolled_in_course"("p_course_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_enrolled_in_course"("p_course_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_exam_group_member"("p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_exam_group_member"("p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_exam_group_member"("p_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_exam_group_writer"("p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_exam_group_writer"("p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_exam_group_writer"("p_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_teacher"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_teacher"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_teacher"() TO "service_role";



GRANT ALL ON FUNCTION "public"."teacher_owns_course"("p_course_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."teacher_owns_course"("p_course_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."teacher_owns_course"("p_course_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."teacher_owns_student"("p_student_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."teacher_owns_student"("p_student_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."teacher_owns_student"("p_student_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."check_answer_rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."choral_practice_completions" TO "anon";
GRANT ALL ON TABLE "public"."choral_practice_completions" TO "authenticated";
GRANT ALL ON TABLE "public"."choral_practice_completions" TO "service_role";



GRANT ALL ON TABLE "public"."comprehension_questions" TO "anon";
GRANT ALL ON TABLE "public"."comprehension_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."comprehension_questions" TO "service_role";



GRANT ALL ON TABLE "public"."comprehension_responses" TO "anon";
GRANT ALL ON TABLE "public"."comprehension_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."comprehension_responses" TO "service_role";



GRANT ALL ON TABLE "public"."content_tags" TO "anon";
GRANT ALL ON TABLE "public"."content_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."content_tags" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_prompts" TO "anon";
GRANT ALL ON TABLE "public"."conversation_prompts" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_prompts" TO "service_role";



GRANT ALL ON TABLE "public"."course_enrollments" TO "anon";
GRANT ALL ON TABLE "public"."course_enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."course_enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."dictation_attempts" TO "anon";
GRANT ALL ON TABLE "public"."dictation_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."dictation_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."exam_groups" TO "anon";
GRANT ALL ON TABLE "public"."exam_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."exam_groups" TO "service_role";



GRANT ALL ON TABLE "public"."exam_prompts" TO "anon";
GRANT ALL ON TABLE "public"."exam_prompts" TO "authenticated";
GRANT ALL ON TABLE "public"."exam_prompts" TO "service_role";



GRANT ALL ON TABLE "public"."expressions" TO "anon";
GRANT ALL ON TABLE "public"."expressions" TO "authenticated";
GRANT ALL ON TABLE "public"."expressions" TO "service_role";



GRANT ALL ON TABLE "public"."grammar_tags" TO "anon";
GRANT ALL ON TABLE "public"."grammar_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."grammar_tags" TO "service_role";



GRANT ALL ON TABLE "public"."group_exam_submissions" TO "anon";
GRANT ALL ON TABLE "public"."group_exam_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."group_exam_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."personal_questions" TO "anon";
GRANT ALL ON TABLE "public"."personal_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."personal_questions" TO "service_role";



GRANT ALL ON TABLE "public"."personal_responses" TO "anon";
GRANT ALL ON TABLE "public"."personal_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."personal_responses" TO "service_role";



GRANT ALL ON TABLE "public"."phonetic_tags" TO "anon";
GRANT ALL ON TABLE "public"."phonetic_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."phonetic_tags" TO "service_role";



GRANT ALL ON TABLE "public"."presentation_prompts" TO "anon";
GRANT ALL ON TABLE "public"."presentation_prompts" TO "authenticated";
GRANT ALL ON TABLE "public"."presentation_prompts" TO "service_role";



GRANT ALL ON TABLE "public"."presentation_responses" TO "anon";
GRANT ALL ON TABLE "public"."presentation_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."presentation_responses" TO "service_role";



GRANT ALL ON TABLE "public"."presentation_vocab_notes" TO "anon";
GRANT ALL ON TABLE "public"."presentation_vocab_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."presentation_vocab_notes" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."pronunciation_attempts" TO "anon";
GRANT ALL ON TABLE "public"."pronunciation_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."pronunciation_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."pronunciation_drills" TO "anon";
GRANT ALL ON TABLE "public"."pronunciation_drills" TO "authenticated";
GRANT ALL ON TABLE "public"."pronunciation_drills" TO "service_role";



GRANT ALL ON TABLE "public"."session_attendance" TO "anon";
GRANT ALL ON TABLE "public"."session_attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."session_attendance" TO "service_role";



GRANT ALL ON TABLE "public"."song_lyric_attempts" TO "anon";
GRANT ALL ON TABLE "public"."song_lyric_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."song_lyric_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."sound_videos" TO "anon";
GRANT ALL ON TABLE "public"."sound_videos" TO "authenticated";
GRANT ALL ON TABLE "public"."sound_videos" TO "service_role";



GRANT ALL ON TABLE "public"."stories" TO "anon";
GRANT ALL ON TABLE "public"."stories" TO "authenticated";
GRANT ALL ON TABLE "public"."stories" TO "service_role";



GRANT ALL ON TABLE "public"."story_audio" TO "anon";
GRANT ALL ON TABLE "public"."story_audio" TO "authenticated";
GRANT ALL ON TABLE "public"."story_audio" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_periods" TO "anon";
GRANT ALL ON TABLE "public"."subscription_periods" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_periods" TO "service_role";



GRANT ALL ON TABLE "public"."user_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_progress" TO "service_role";



GRANT ALL ON TABLE "public"."user_topic_evidence" TO "anon";
GRANT ALL ON TABLE "public"."user_topic_evidence" TO "authenticated";
GRANT ALL ON TABLE "public"."user_topic_evidence" TO "service_role";



GRANT ALL ON TABLE "public"."video_summary_free_writes" TO "anon";
GRANT ALL ON TABLE "public"."video_summary_free_writes" TO "authenticated";
GRANT ALL ON TABLE "public"."video_summary_free_writes" TO "service_role";



GRANT ALL ON TABLE "public"."video_summary_paragraphs" TO "anon";
GRANT ALL ON TABLE "public"."video_summary_paragraphs" TO "authenticated";
GRANT ALL ON TABLE "public"."video_summary_paragraphs" TO "service_role";



GRANT ALL ON TABLE "public"."video_summary_teaching_notes" TO "anon";
GRANT ALL ON TABLE "public"."video_summary_teaching_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."video_summary_teaching_notes" TO "service_role";



GRANT ALL ON TABLE "public"."vocabulary_tags" TO "anon";
GRANT ALL ON TABLE "public"."vocabulary_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."vocabulary_tags" TO "service_role";



GRANT ALL ON TABLE "public"."word_flag_requests" TO "anon";
GRANT ALL ON TABLE "public"."word_flag_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."word_flag_requests" TO "service_role";



GRANT ALL ON TABLE "public"."word_flags" TO "anon";
GRANT ALL ON TABLE "public"."word_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."word_flags" TO "service_role";



GRANT ALL ON TABLE "public"."word_lookups" TO "anon";
GRANT ALL ON TABLE "public"."word_lookups" TO "authenticated";
GRANT ALL ON TABLE "public"."word_lookups" TO "service_role";



GRANT ALL ON TABLE "public"."words" TO "anon";
GRANT ALL ON TABLE "public"."words" TO "authenticated";
GRANT ALL ON TABLE "public"."words" TO "service_role";



GRANT ALL ON TABLE "public"."writing_corrections" TO "anon";
GRANT ALL ON TABLE "public"."writing_corrections" TO "authenticated";
GRANT ALL ON TABLE "public"."writing_corrections" TO "service_role";



GRANT ALL ON TABLE "public"."writing_prompts" TO "anon";
GRANT ALL ON TABLE "public"."writing_prompts" TO "authenticated";
GRANT ALL ON TABLE "public"."writing_prompts" TO "service_role";



GRANT ALL ON TABLE "public"."writing_submissions" TO "anon";
GRANT ALL ON TABLE "public"."writing_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."writing_submissions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































