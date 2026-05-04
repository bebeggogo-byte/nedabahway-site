"use client";

import { useState } from "react";
import { BUSINESS_INFO } from "@/lib/business-info";

export interface ConsentState {
  terms: boolean;
  privacy: boolean;
  refund: boolean;
  parental: boolean;
  marketing: boolean;
}

interface Props {
  /** 만 14세 미만이면 보호자 동의 체크박스 노출 */
  showParental?: boolean;
  /** 동의 상태 변경 시 호출. 모든 필수 동의가 true일 때만 결제 버튼 활성화. */
  onChange: (state: ConsentState, allRequiredChecked: boolean) => void;
}

/**
 * 결제·가입 시 표시되는 약관 동의 체크박스.
 *
 * 필수 3종 (이용약관·개인정보·환불정책) + 조건부 1종 (보호자 동의) +
 * 선택 1종 (마케팅 수신).
 *
 * 필수 항목 모두 체크되면 onChange의 두 번째 인자(allRequiredChecked)가
 * true로 전달됨. 호출자는 이 값으로 결제 버튼 disabled 제어.
 */
export function ConsentCheckboxes({ showParental = false, onChange }: Props) {
  const [state, setState] = useState<ConsentState>({
    terms: false,
    privacy: false,
    refund: false,
    parental: !showParental, // 노출 안 되면 자동 통과
    marketing: false,
  });

  const update = (patch: Partial<ConsentState>) => {
    const next = { ...state, ...patch };
    setState(next);
    const allRequired = next.terms && next.privacy && next.refund && next.parental;
    onChange(next, allRequired);
  };

  const Item = ({
    id,
    checked,
    onCheck,
    required,
    children,
  }: {
    id: string;
    checked: boolean;
    onCheck: (v: boolean) => void;
    required: boolean;
    children: React.ReactNode;
  }) => (
    <label
      htmlFor={id}
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        padding: "10px 0",
        cursor: "pointer",
        fontSize: ".96rem",
      }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheck(e.target.checked)}
        style={{ marginTop: 4 }}
        aria-required={required}
      />
      <span>
        {required ? (
          <strong style={{ color: "var(--color-danger, #c00)" }}>(필수) </strong>
        ) : (
          <span style={{ color: "var(--color-mute)" }}>(선택) </span>
        )}
        {children}
      </span>
    </label>
  );

  return (
    <fieldset
      style={{
        marginTop: 32,
        padding: "16px 20px",
        border: "1px solid var(--color-line)",
        borderRadius: 8,
      }}
    >
      <legend style={{ padding: "0 8px", fontWeight: 600 }}>약관 동의</legend>

      <Item
        id="consent-terms"
        checked={state.terms}
        onCheck={(v) => update({ terms: v })}
        required
      >
        <a href="/terms" target="_blank" rel="noopener">이용약관</a>에 동의합니다
      </Item>

      <Item
        id="consent-privacy"
        checked={state.privacy}
        onCheck={(v) => update({ privacy: v })}
        required
      >
        <a href="/privacy" target="_blank" rel="noopener">개인정보처리방침</a>에 동의합니다
      </Item>

      <Item
        id="consent-refund"
        checked={state.refund}
        onCheck={(v) => update({ refund: v })}
        required
      >
        <a href="/refund-policy" target="_blank" rel="noopener">환불정책</a>을 확인했습니다
      </Item>

      {showParental && (
        <Item
          id="consent-parental"
          checked={state.parental}
          onCheck={(v) => update({ parental: v })}
          required
        >
          만 14세 미만이며, 보호자 동의를 받았습니다.
          가입 후 보호자 이메일로 별도 동의 링크가 발송됨에 동의합니다.
        </Item>
      )}

      <Item
        id="consent-marketing"
        checked={state.marketing}
        onCheck={(v) => update({ marketing: v })}
        required={false}
      >
        마케팅 정보 수신에 동의합니다 (이벤트·신규 트랙 안내, 언제든 수신거부 가능)
      </Item>

      <p style={{ marginTop: 12, fontSize: ".82rem", color: "var(--color-mute)" }}>
        약관 시행일: {BUSINESS_INFO.termsVersion} · 개인정보 처리방침: {BUSINESS_INFO.privacyVersion}
      </p>
    </fieldset>
  );
}
