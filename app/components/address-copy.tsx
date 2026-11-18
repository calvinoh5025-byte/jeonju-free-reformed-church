"use client";

import { useEffect, useState } from "react";

export function AddressCopy({ address }: { address: string }) {
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (!copied) return; const timer = window.setTimeout(() => setCopied(false), 2000); return () => window.clearTimeout(timer); }, [copied]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(address); setMessage("복사했습니다"); setCopied(true); }
    catch { setMessage("주소를 복사하지 못했습니다"); }
  };
  return <span className="address-copy"><button type="button" onClick={copy}>{copied ? "복사했습니다" : "주소 복사"}</button><span aria-live="polite" className="sr-only">{message}</span></span>;
}
