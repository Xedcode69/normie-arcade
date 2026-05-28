"use client";

import { useEffect, useRef, useState } from "react";
import { NormieImage } from "./NormieImage";

type Props = {
  src: string;
  alt: string;
  className?: string;
};

export function CenteredNormieImage({ src, alt, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = src;

    image.onload = () => {
      if (cancelled) return;

      const size = 160;
      const sample = document.createElement("canvas");
      sample.width = image.naturalWidth;
      sample.height = image.naturalHeight;

      const sampleContext = sample.getContext("2d", { willReadFrequently: true });
      const context = canvas.getContext("2d");
      if (!sampleContext || !context) {
        setFallback(true);
        return;
      }

      try {
        sampleContext.drawImage(image, 0, 0);
        const pixels = sampleContext.getImageData(0, 0, sample.width, sample.height);
        let minX = sample.width;
        let minY = sample.height;
        let maxX = 0;
        let maxY = 0;

        for (let y = 0; y < sample.height; y += 1) {
          for (let x = 0; x < sample.width; x += 1) {
            const index = (y * sample.width + x) * 4;
            const alpha = pixels.data[index + 3];
            const red = pixels.data[index];
            const green = pixels.data[index + 1];
            const blue = pixels.data[index + 2];
            const isDarkPixel = alpha > 10 && red < 190 && green < 190 && blue < 190;

            if (isDarkPixel) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }

        canvas.width = size;
        canvas.height = size;
        context.imageSmoothingEnabled = false;
        context.fillStyle = "#f4f1e8";
        context.fillRect(0, 0, size, size);

        if (maxX <= minX || maxY <= minY) {
          context.drawImage(image, 0, 0, size, size);
          return;
        }

        const sourceWidth = maxX - minX + 1;
        const sourceHeight = maxY - minY + 1;
        const padding = 18;
        const scale = Math.min((size - padding * 2) / sourceWidth, (size - padding * 2) / sourceHeight);
        const drawWidth = Math.round(sourceWidth * scale);
        const drawHeight = Math.round(sourceHeight * scale);
        const drawX = Math.round((size - drawWidth) / 2);
        const drawY = Math.round((size - drawHeight) / 2);

        context.drawImage(image, minX, minY, sourceWidth, sourceHeight, drawX, drawY, drawWidth, drawHeight);
      } catch {
        setFallback(true);
      }
    };

    image.onerror = () => setFallback(true);

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (fallback) {
    return <NormieImage src={src} alt={alt} className={className} />;
  }

  return <canvas ref={canvasRef} aria-label={alt} role="img" className={className} />;
}
