"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CoachRefundActions({ refundId }: { refundId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const approve = async () => {
    if (!confirm("토스페이먼츠로 환불 처리합니다. 진행할까요?")) return;
    setBusy("approve");
    setError(null);
    const res = await fetch(`/api/refunds/${refundId}/approve`, { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setError(data?.detail ?? data?.message ?? data?.error ?? "승인 실패");
      setBusy(null);
      return;
    }
    setBusy(null);
    router.refresh();
  };

  const reject = async () => {
    const reason = prompt("반려 사유를 입력하십시오 (학생에게 전달됩니다)");
    if (!reason) return;
    setBusy("reject");
    setError(null);
    const res = await fetch(`/api/refunds/${refundId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rejectReason: reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.detail ?? data?.error ?? "반려 실패");
      setBusy(null);
      return;
    }
    setBusy(null);
    router.refresh();
  };

  return (
    <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
      <button className="btn btn--primary" onClick={approve} disabled={busy !== null}>
        {busy === "approve" ? "환불 처리 중..." : "승인 + 환불"}
      </button>
      <button className="btn btn--danger" onClick={reject} disabled={busy !== null}>
        {busy === "reject" ? "반려 중..." : "반려"}
      </button>
      {error && (
        <span style={{ color: "var(--color-danger)", fontSize: ".88rem" }}>{error}</span>
      )}
    </div>
  );
}
