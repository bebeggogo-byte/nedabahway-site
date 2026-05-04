"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  paymentId: string;
  enrollmentId: string;
  previewAmountKrw: number;
}

export function RefundRequestForm({ paymentId, enrollmentId, previewAmountKrw }: Props) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 10) {
      setError("사유는 10자 이상 입력해 주십시오.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/refunds/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, studentReason: reason.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.message ?? data?.error ?? "신청 실패. 잠시 후 다시 시도해 주십시오.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    router.push(`/refunds?ok=${data.refundRequestId}`);
  };

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 32, display: "grid", gap: 16 }}>
      <label>
        <span style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
          환불 사유 (10자 이상)
        </span>
        <textarea
          rows={5}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="환불을 원하시는 이유를 적어 주십시오. 코치(사장님)가 직접 검토합니다."
          required
          minLength={10}
        />
      </label>

      <p className="body" style={{ fontSize: ".88rem" }}>
        신청 즉시 결제 수단으로 환불되지 않습니다. 코치가 검토·승인한 뒤 토스페이먼츠를 통해 환불됩니다.
        승인 시점에 비율이 다시 계산되며, 더 낮은 구간으로 진입했다면 그 비율이 적용됩니다.
      </p>

      {error && (
        <p style={{ color: "var(--color-danger)", fontSize: ".92rem" }} role="alert">
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn--primary" type="submit" disabled={submitting || reason.trim().length < 10}>
          {submitting ? "신청 중..." : `${(previewAmountKrw / 10_000).toLocaleString()}만원 환불 신청 →`}
        </button>
      </div>
    </form>
  );
}
