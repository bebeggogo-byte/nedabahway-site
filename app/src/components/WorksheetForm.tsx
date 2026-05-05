"use client";

/**
 * 워크시트 인터랙티브 폼.
 * - JSON Schema 기반 동적 필드 렌더링 (textarea / short_text)
 * - 30초마다 draft 자동 저장 (debounced + interval)
 * - interaction_events 수집 (focus·blur·idle·delete_burst·paste·submit_attempt)
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

type FieldType = "textarea" | "short_text";

interface FieldDef {
  key: string;
  type: FieldType;
  title: string;
  description?: string;
  minLength?: number;
  maxLength?: number;
  required: boolean;
}

interface Props {
  templateId: string;
  templateCode: string;
  sessionProgressId: string;
  schema: Record<string, unknown>;
  uiSchema: Record<string, unknown> | null;
  existingResponseId: string | null;
  initialContent: Record<string, string>;
  initialTimeSpent: number;
  isSubmitted: boolean;
}

const AUTOSAVE_INTERVAL_MS = 30_000;
const IDLE_THRESHOLD_MS = 30_000;
const DELETE_BURST_THRESHOLD = 30; // 30 chars deleted within 5s

export function WorksheetForm({
  templateId,
  sessionProgressId,
  schema,
  uiSchema,
  existingResponseId,
  initialContent,
  initialTimeSpent,
  isSubmitted,
}: Props) {
  const fields = useMemo(() => parseFields(schema, uiSchema), [schema, uiSchema]);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, initialContent[f.key] ?? ""]))
  );
  const [responseId, setResponseId] = useState<string | null>(existingResponseId);
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "submitted" | "error">(
    isSubmitted ? "submitted" : "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const lastInteractionRef = useRef<number>(Date.now());
  const startTimeRef = useRef<number>(Date.now());
  const deleteBufferRef = useRef<{ time: number; count: number }[]>([]);
  const supabase = useMemo(() => createClient(), []);

  // ── interaction event recorder ────────────────────────────
  const recordEvent = useCallback(
    async (kind: string, fieldKey?: string, payload?: unknown) => {
      if (!responseId) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("interaction_events").insert({
        response_id: responseId,
        user_id: user.id,
        kind: kind as "field_focus",
        field_key: fieldKey ?? null,
        payload: payload ? (payload as never) : null,
      });
    },
    [responseId, supabase]
  );

  // ── upsert (create response on first save) ────────────────
  const saveDraft = useCallback(
    async (force = false) => {
      if (isSubmitted && !force) return;
      setSavingState("saving");

      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000) + initialTimeSpent;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSavingState("error");
        return;
      }

      try {
        if (!responseId) {
          const { data, error } = await supabase
            .from("worksheet_responses")
            .insert({
              session_progress_id: sessionProgressId,
              template_id: templateId,
              user_id: user.id,
              content: values,
              status: "draft",
              draft_count: 1,
              time_spent_seconds: timeSpent,
            })
            .select("id")
            .single();
          if (error) throw error;
          setResponseId((data as { id: string }).id);
        } else {
          const { error } = await supabase
            .from("worksheet_responses")
            .update({
              content: values,
              draft_count: undefined,
              time_spent_seconds: timeSpent,
            })
            .eq("id", responseId);
          if (error) throw error;
          // draft_count 증가는 별도 RPC로 (간단히 클라이언트에서는 skip)
        }
        setSavingState("saved");
      } catch (e) {
        console.error("[autosave]", e);
        setSavingState("error");
      }
    },
    [responseId, supabase, values, sessionProgressId, templateId, initialTimeSpent, isSubmitted]
  );

  // ── auto-save interval ────────────────────────────────────
  useEffect(() => {
    if (isSubmitted) return;
    const id = setInterval(() => {
      void saveDraft();
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [saveDraft, isSubmitted]);

  // ── idle detection ────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() - lastInteractionRef.current > IDLE_THRESHOLD_MS) {
        void recordEvent("idle_30s");
        lastInteractionRef.current = Date.now(); // reset to avoid spam
      }
    }, IDLE_THRESHOLD_MS);
    return () => clearInterval(id);
  }, [recordEvent]);

  // ── handlers ──────────────────────────────────────────────
  const handleChange = (key: string, value: string) => {
    const prev = values[key] ?? "";
    setValues((s) => ({ ...s, [key]: value }));
    lastInteractionRef.current = Date.now();

    // delete burst detection (very rough)
    const deleted = prev.length - value.length;
    if (deleted > 0) {
      const now = Date.now();
      deleteBufferRef.current.push({ time: now, count: deleted });
      // window 5s
      const totalDeleted = deleteBufferRef.current
        .filter((b) => now - b.time < 5000)
        .reduce((sum, b) => sum + b.count, 0);
      if (totalDeleted >= DELETE_BURST_THRESHOLD) {
        void recordEvent("delete_burst", key, { totalDeleted });
        deleteBufferRef.current = [];
      }
    }
  };

  const handleFocus = (key: string) => {
    void recordEvent("field_focus", key);
  };
  const handleBlur = (key: string) => {
    void recordEvent("field_blur", key);
  };
  const handlePaste = (key: string, e: React.ClipboardEvent) => {
    void recordEvent("paste", key, { length: e.clipboardData.getData("text").length });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    void recordEvent("submit_attempt");

    // 클라이언트 validation
    const missing = fields.filter((f) => f.required && !(values[f.key] ?? "").trim());
    if (missing.length > 0) {
      setErrorMsg(`필수 항목이 비어 있습니다: ${missing.map((m) => m.title).join(", ")}`);
      return;
    }
    setErrorMsg(null);
    setSubmitState("submitting");

    // 마지막 자동 저장 후 status='submitted'
    await saveDraft(true);
    if (!responseId) {
      // saveDraft 후에 responseId 셋팅됨. 한 번 더 시도.
      await saveDraft(true);
    }

    if (responseId) {
      const { error } = await supabase
        .from("worksheet_responses")
        .update({ status: "submitted", submitted_at: new Date().toISOString() })
        .eq("id", responseId);
      if (error) {
        setSubmitState("error");
        setErrorMsg("제출 실패: " + error.message);
        return;
      }
      // session_progress 도 submitted로
      await supabase
        .from("session_progress")
        .update({ status: "submitted", submitted_at: new Date().toISOString() })
        .eq("id", sessionProgressId);
    }

    setSubmitState("submitted");
  };

  // ── render ────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 32, display: "grid", gap: 22 }}>
      {fields.map((f) => (
        <div key={f.key}>
          <label htmlFor={f.key} style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
            {f.title}
            {f.required && <span style={{ color: "var(--color-danger)" }}> *</span>}
          </label>
          {f.description && (
            <p className="body" style={{ marginBottom: 10, fontSize: ".88rem" }}>
              {f.description}
            </p>
          )}
          {f.type === "textarea" ? (
            <textarea
              id={f.key}
              value={values[f.key] ?? ""}
              onChange={(e) => handleChange(f.key, e.target.value)}
              onFocus={() => handleFocus(f.key)}
              onBlur={() => handleBlur(f.key)}
              onPaste={(e) => handlePaste(f.key, e)}
              rows={6}
              maxLength={f.maxLength}
              disabled={submitState === "submitted"}
            />
          ) : (
            <input
              id={f.key}
              type="text"
              value={values[f.key] ?? ""}
              onChange={(e) => handleChange(f.key, e.target.value)}
              onFocus={() => handleFocus(f.key)}
              onBlur={() => handleBlur(f.key)}
              onPaste={(e) => handlePaste(f.key, e)}
              maxLength={f.maxLength}
              disabled={submitState === "submitted"}
            />
          )}
          {f.maxLength && (
            <div
              style={{
                fontSize: ".78rem",
                color: "var(--color-ink-soft)",
                marginTop: 4,
                textAlign: "right",
              }}
            >
              {(values[f.key] ?? "").length} / {f.maxLength}
            </div>
          )}
        </div>
      ))}

      {errorMsg && (
        <p style={{ color: "var(--color-danger)", fontSize: ".92rem" }} role="alert">
          {errorMsg}
        </p>
      )}

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginTop: 8,
          flexWrap: "wrap",
        }}
      >
        <button
          type="submit"
          className="btn btn--primary"
          disabled={submitState === "submitting" || submitState === "submitted"}
        >
          {submitState === "submitted"
            ? "제출 완료"
            : submitState === "submitting"
            ? "제출 중..."
            : "제출하기"}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => void saveDraft()}
          disabled={savingState === "saving" || submitState === "submitted"}
        >
          지금 저장
        </button>
        <span
          style={{
            fontSize: ".82rem",
            color:
              savingState === "saved"
                ? "var(--color-green-deep)"
                : savingState === "error"
                ? "var(--color-danger)"
                : "var(--color-ink-soft)",
          }}
        >
          {savingState === "idle" && "수정 시 30초마다 자동 저장됩니다"}
          {savingState === "saving" && "저장 중..."}
          {savingState === "saved" && "저장됨"}
          {savingState === "error" && "저장 실패 — 인터넷 연결 확인"}
        </span>
      </div>
    </form>
  );
}

// ── helper: schema → field defs ─────────────────────────────
function parseFields(
  schema: Record<string, unknown>,
  uiSchema: Record<string, unknown> | null
): FieldDef[] {
  const props = (schema?.properties ?? {}) as Record<string, Record<string, unknown>>;
  const required = (schema?.required ?? []) as string[];
  const ui = (uiSchema ?? {}) as Record<string, Record<string, unknown>>;

  return Object.entries(props).map(([key, def]) => {
    const widget = (ui[key]?.widget as FieldType | undefined) ?? "textarea";
    return {
      key,
      type: widget,
      title: (def.title as string) ?? key,
      description: def.description as string | undefined,
      minLength: def.minLength as number | undefined,
      maxLength: def.maxLength as number | undefined,
      required: required.includes(key),
    };
  });
}
