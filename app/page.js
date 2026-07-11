"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
        background: "#1a1a1a",
        fontFamily:
          '-apple-system, "Hiragino Kaku Gothic ProN", sans-serif',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#2b2b2b",
          padding: 32,
          borderRadius: 12,
          width: 320,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}
      >
        <h1 style={{ color: "#eee", fontSize: 18, marginBottom: 20 }}>
          3D モデルビューアー ログイン
        </h1>
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: "100%",
            padding: 10,
            marginBottom: 12,
            borderRadius: 6,
            border: "1px solid #444",
            background: "#1a1a1a",
            color: "#eee",
            boxSizing: "border-box",
          }}
        />
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: "100%",
            padding: 10,
            marginBottom: 12,
            borderRadius: 6,
            border: "1px solid #444",
            background: "#1a1a1a",
            color: "#eee",
            boxSizing: "border-box",
          }}
        />
        {error && (
          <p style={{ color: "#e55", fontSize: 13, marginBottom: 12 }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 6,
            border: "none",
            background: "#7a1f1f",
            color: "#fff",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          {loading ? "確認中..." : "ログイン"}
        </button>
      </form>
    </div>
  );
}
