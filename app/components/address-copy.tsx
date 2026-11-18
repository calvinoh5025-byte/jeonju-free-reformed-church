"use client";

import { useState } from "react";

export function AddressCopy({ address }: { address: string }) {
  const [message, setMessage] = useState("");
  const copy = async () => {
    try { await navigator.clipboard.writeText(address); setMessage("복사했습니다"); }
    catch { setMessage("주소를 복사하지 못했습니다"); }
  };
  return <span className="address-copy"><button type="button" onClick={copy}>주소 복사</button><span aria-live="polite" className="sr-only">{message}</span></span>;
}
