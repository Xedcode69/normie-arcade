"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  className?: string;
};

export function NormieImage({ src, alt, className }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`grid place-items-center bg-black/50 text-[10px] uppercase tracking-widest text-paper ${className ?? ""}`}>
        Normie
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}
