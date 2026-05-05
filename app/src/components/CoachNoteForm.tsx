"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function CoachNoteForm({ enrollmentId }: { enrollmentId: string }) {
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"coach_only" | "student_visible">("coach_only");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("세션 만료. 새로고침 후 다시 시도.");
      setSubmitting(false);
      return;
    }
    const { error: err } = await supabase.from("coach_notes").insert({
      enrollment_id: enrollmentId,
      author_id: user.id,
      body,
      visibility,
    });
    if (err) {
      setError("저장 실패: " + err.message);
      setSubmitting(false);
      return;
    }
    setBody("");
    setSubmitting(false);
    // SSR refresh
    window.location.reload();
  };

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 10 }}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="이번 회기에서 관찰된 결, 다음 주 과제, 막힌 지점."
      />
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontSize: ".88rem" }}>
          <input
            type="radio"
            checked={visibility === "coach_only"}
            onChange={() => setVisibility("coach_only")}
            style={{ marginRight: 6 }}
          />
          코치 전용
        </label>
        <label style={{ fontSize: ".88rem" }}>
          <input
            type="radio"
            checked={visibility === "student_visible"}
            onChange={() => setVisibility("student_visible")}
            style={{ marginRight: 6 }}
          />
          학생도 볼 수 있게
        </label>
        <button className="btn btn--primary" type="submit" disabled={submitting || !body.trim()}>
          메모 저장
        </button>
      </div>
      {error && <p style={{ color: "var(--color-danger)", fontSize: ".88rem" }}>{error}</p>}
    </form>
  );
}
