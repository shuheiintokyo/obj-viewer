"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const COLORS = {
  bg: "#0B1E33",
  panel: "#142A42",
  grid: "#1E3A56",
  amber: "#E8A33D",
  amberDim: "#B87F2A",
  text: "#EAF2FA",
  muted: "#7C93AC",
  danger: "#E8746A",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        router.push("/viewer");
      } else {
        setError(data.error || "ログインに失敗しました。");
      }
    } catch (err) {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: `
          repeating-linear-gradient(0deg, ${COLORS.grid} 0px, transparent 1px, transparent 32px, ${COLORS.grid} 33px),
          repeating-linear-gradient(90deg, ${COLORS.grid} 0px, transparent 1px, transparent 32px, ${COLORS.grid} 33px),
          ${COLORS.bg}
        `,
        backgroundBlendMode: "overlay, overlay, normal",
        fontFamily: "var(--font-sans), sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 20,
        }}
      >
        <InfoPanel />
        <form
          onSubmit={handleSubmit}
          style={{
            position: "relative",
            background: COLORS.panel,
            width: 360,
            border: `1px solid ${COLORS.grid}`,
            boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          }}
        >
        {/* corner tick marks, like a drawing sheet border */}
        {[
          { top: -1, left: -1, borderWidth: "2px 0 0 2px" },
          { top: -1, right: -1, borderWidth: "2px 2px 0 0" },
          { bottom: -1, left: -1, borderWidth: "0 0 2px 2px" },
          { bottom: -1, right: -1, borderWidth: "0 2px 2px 0" },
        ].map((pos, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              width: 14,
              height: 14,
              borderStyle: "solid",
              borderColor: COLORS.amber,
              ...pos,
            }}
          />
        ))}

        {/* title block header row */}
        <div
          style={{
            borderBottom: `1px solid ${COLORS.grid}`,
            padding: "18px 24px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.12em",
              color: COLORS.amber,
              marginBottom: 6,
            }}
          >
            ACCESS CONTROL
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: COLORS.text }}>
            3D モデルビューアー
          </div>
        </div>

        <div style={{ padding: "20px 24px 24px 24px" }}>
          <Field
            label="EMAIL"
            type="email"
            value={email}
            onChange={setEmail}
          />
          <Field
            label="PASSWORD"
            type="password"
            value={password}
            onChange={setPassword}
          />

          {error && (
            <p
              style={{
                color: COLORS.danger,
                fontSize: 12.5,
                fontFamily: "var(--font-mono), monospace",
                margin: "4px 0 16px 0",
              }}
            >
              ! {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "11px 0",
              marginTop: 16,
              border: "none",
              background: loading ? COLORS.amberDim : COLORS.amber,
              color: "#1a1206",
              fontFamily: "var(--font-mono), monospace",
              fontWeight: 600,
              fontSize: 13,
              letterSpacing: "0.06em",
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "確認中..." : "ログイン →"}
          </button>
        </div>

        {/* footer strip like a drawing revision row */}
        <div
          style={{
            borderTop: `1px solid ${COLORS.grid}`,
            padding: "8px 24px",
            fontFamily: "var(--font-mono), monospace",
            fontSize: 10,
            color: COLORS.muted,
            letterSpacing: "0.04em",
          }}
        >
          REV. 01 — INTERNAL USE ONLY
        </div>
      </form>
      </div>
    </div>
  );
}

function InfoPanel() {
  return (
    <div
      style={{
        position: "relative",
        background: COLORS.panel,
        width: 360,
        border: `1px solid ${COLORS.grid}`,
        boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
      }}
    >
      <div
        style={{
          borderBottom: `1px solid ${COLORS.grid}`,
          padding: "18px 24px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 11,
            letterSpacing: "0.12em",
            color: COLORS.amber,
            marginBottom: 6,
          }}
        >
          ABOUT THIS TOOL
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, lineHeight: 1.5 }}>
          OBJ形式の3Dモデルを、CADソフトを使わずにブラウザー画面に表示できます。ファイルの中身は外部に送信されません。
        </div>
      </div>

      <InfoRow label="必要なもの">
        形状データの <Mono>.obj</Mono> ファイル。色・材質を表示したい場合は、同名の <Mono>.mtl</Mono> ファイルも一緒に選択してください（任意）。
      </InfoRow>
      <InfoRow label="お問い合わせ" last>
        ご質問・ご要望は衣笠まで。
      </InfoRow>
    </div>
  );
}

function InfoRow({ label, children, last }) {
  return (
    <div
      style={{
        padding: "14px 24px",
        borderBottom: last ? "none" : `1px solid ${COLORS.grid}`,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: 10.5,
          letterSpacing: "0.1em",
          color: COLORS.muted,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

function Mono({ children }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono), monospace",
        color: COLORS.amber,
        fontSize: 12.5,
      }}
    >
      {children}
    </span>
  );
}

function Field({ label, type, value, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: "block",
          fontFamily: "var(--font-mono), monospace",
          fontSize: 10.5,
          letterSpacing: "0.1em",
          color: COLORS.muted,
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          background: COLORS.bg,
          border: `1px solid ${COLORS.grid}`,
          color: COLORS.text,
          fontSize: 14,
          boxSizing: "border-box",
          outline: "none",
        }}
        onFocus={(e) => (e.target.style.borderColor = COLORS.amber)}
        onBlur={(e) => (e.target.style.borderColor = COLORS.grid)}
      />
    </div>
  );
}
