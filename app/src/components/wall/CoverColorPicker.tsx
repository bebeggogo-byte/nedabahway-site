"use client";

/**
 * 담벼락 커버 색 선택기. 토큰 팔레트(WALL_COLORS) 프리셋 스와치.
 * 라디오 입력 기반 — 폼 제출 시 cover_color 필드로 전송.
 */
import { useState } from "react";
import { WALL_COLORS, DEFAULT_COVER_COLOR } from "./wall-constants";

interface CoverColorPickerProps {
  name: string;
  defaultValue?: string;
}

export function CoverColorPicker({
  name,
  defaultValue = DEFAULT_COVER_COLOR,
}: CoverColorPickerProps) {
  const [selected, setSelected] = useState(defaultValue);

  return (
    <div
      role="radiogroup"
      aria-label="커버 색상"
      style={{ display: "flex", flexWrap: "wrap", gap: 10 }}
    >
      {WALL_COLORS.map((color) => {
        const isSelected = selected === color.value;
        return (
          <label
            key={color.value}
            title={color.label}
            style={{
              cursor: "pointer",
              display: "inline-flex",
              borderRadius: "999px",
            }}
          >
            <input
              type="radio"
              name={name}
              value={color.value}
              checked={isSelected}
              onChange={() => setSelected(color.value)}
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                opacity: 0,
                margin: -1,
              }}
            />
            <span
              aria-hidden
              style={{
                display: "block",
                width: 36,
                height: 36,
                borderRadius: "999px",
                background: color.value,
                border: isSelected
                  ? "3px solid var(--color-green-deep)"
                  : "1px solid var(--color-line-strong)",
                boxShadow: isSelected ? "0 0 0 2px var(--color-paper) inset" : "none",
                transition: "border-color 0.12s",
              }}
            />
            <span
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                overflow: "hidden",
                clip: "rect(0 0 0 0)",
              }}
            >
              {color.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
