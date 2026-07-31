// Resizes to maxWidth, applies gentle auto-levels/highlight-recovery/
// unsharp-mask/brightness correction, and re-encodes as JPEG q=0.85.
// Shared by the admin vehicle photo uploader and the booking photo
// uploader so both produce visually consistent, similarly-sized images.
export function compressImage(file: File, maxWidth: number, _quality: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      reject(new Error("Only JPEG, PNG and WebP images are allowed"));
      return;
    }
    if (file.size <= 0 || file.size > 15 * 1024 * 1024) {
      reject(new Error("Image must be between 1 byte and 15 MB"));
      return;
    }
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (
        !img.naturalWidth ||
        !img.naturalHeight ||
        img.naturalWidth * img.naturalHeight > 40_000_000
      ) {
        reject(new Error("Image dimensions are invalid or too large"));
        return;
      }
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Image processor is unavailable")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const d = imgData.data;
      const total = w * h;

      // ── Pass 1: histogram for auto-levels (1% percentile clip) ──────────
      const rH = new Uint32Array(256), gH = new Uint32Array(256), bH = new Uint32Array(256);
      for (let i = 0; i < d.length; i += 4) { rH[d[i]]++; gH[d[i+1]]++; bH[d[i+2]]++; }
      function pct(hist: Uint32Array, p: number): number {
        const target = Math.round(total * p); let acc = 0;
        for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= target) return v; }
        return 255;
      }

      // ── Build per-channel LUT: gentle auto-levels (only if range < 100) ──
      function buildLut(lo: number, hi: number): Uint8Array {
        const lut = new Uint8Array(256);
        const range = hi - lo;
        if (range >= 100) {
          for (let v = 0; v < 256; v++) lut[v] = v;
        } else {
          const r = Math.max(1, range);
          for (let v = 0; v < 256; v++) {
            lut[v] = Math.round(Math.min(1, Math.max(0, (v - lo) / r)) * 255);
          }
        }
        return lut;
      }
      const rLut = buildLut(pct(rH, 0.01), pct(rH, 0.99));
      const gLut = buildLut(pct(gH, 0.01), pct(gH, 0.99));
      const bLut = buildLut(pct(bH, 0.01), pct(bH, 0.99));

      // ── Pass 2: apply gentle auto-levels ────────────────────────────────
      for (let i = 0; i < d.length; i += 4) {
        d[i] = rLut[d[i]]; d[i+1] = gLut[d[i+1]]; d[i+2] = bLut[d[i+2]];
      }

      // ── Pass 3: highlight recovery (blown pixels > 230 all channels) ─────
      const snap = new Uint8ClampedArray(d);
      const BLOWN = 245;
      const BLEND = 0.25;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (snap[i] <= BLOWN || snap[i+1] <= BLOWN || snap[i+2] <= BLOWN) continue;
          let sr = 0, sg = 0, sb = 0, cnt = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const ny = y + dy, nx = x + dx;
              if (ny < 0 || ny >= h || nx < 0 || nx >= w) continue;
              const ni = (ny * w + nx) * 4;
              if (snap[ni] <= BLOWN || snap[ni+1] <= BLOWN || snap[ni+2] <= BLOWN) {
                sr += snap[ni]; sg += snap[ni+1]; sb += snap[ni+2]; cnt++;
              }
            }
          }
          if (cnt > 0) {
            d[i]   = Math.round(d[i]   * (1 - BLEND) + (sr / cnt) * BLEND);
            d[i+1] = Math.round(d[i+1] * (1 - BLEND) + (sg / cnt) * BLEND);
            d[i+2] = Math.round(d[i+2] * (1 - BLEND) + (sb / cnt) * BLEND);
          }
        }
      }

      // ── Pass 4: mild unsharp mask (3×3 box blur, strength 0.3) ──────────
      const blurred = new Uint8ClampedArray(d.length);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let sr = 0, sg = 0, sb = 0, cnt = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const ny = y + dy, nx = x + dx;
              if (ny < 0 || ny >= h || nx < 0 || nx >= w) continue;
              const ni = (ny * w + nx) * 4;
              sr += d[ni]; sg += d[ni+1]; sb += d[ni+2]; cnt++;
            }
          }
          const bi = (y * w + x) * 4;
          blurred[bi] = sr / cnt; blurred[bi+1] = sg / cnt; blurred[bi+2] = sb / cnt;
        }
      }
      const SHARP = 0.3;
      for (let i = 0; i < d.length; i += 4) {
        d[i]   = Math.max(0, Math.min(255, Math.round(d[i]   + SHARP * (d[i]   - blurred[i]))));
        d[i+1] = Math.max(0, Math.min(255, Math.round(d[i+1] + SHARP * (d[i+1] - blurred[i+1]))));
        d[i+2] = Math.max(0, Math.min(255, Math.round(d[i+2] + SHARP * (d[i+2] - blurred[i+2]))));
      }

      // ── Pass 5: final brightness nudge if still off ──────────────────────
      let lumSum = 0;
      for (let i = 0; i < d.length; i += 4) {
        lumSum += 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
      }
      const avgLum = lumSum / total;
      let lumLabel = "normal";
      if (avgLum > 200) {
        lumLabel = "bright";
        for (let i = 0; i < d.length; i += 4) {
          d[i] = Math.round(d[i] * 0.9); d[i+1] = Math.round(d[i+1] * 0.9); d[i+2] = Math.round(d[i+2] * 0.9);
        }
      } else if (avgLum < 50) {
        lumLabel = "dark";
        for (let i = 0; i < d.length; i += 4) {
          d[i] = Math.min(255, Math.round(d[i] * 1.1)); d[i+1] = Math.min(255, Math.round(d[i+1] * 1.1)); d[i+2] = Math.min(255, Math.round(d[i+2] * 1.1));
        }
      }
      console.info(`[photo] optimized: ${lumLabel} (avg lum ${Math.round(avgLum)})`);

      ctx.putImageData(imgData, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Image could not be re-encoded")); return; }
          const name = file.name.replace(/\.[^.]+$/, ".jpg");
          resolve(new File([blob], name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("File is not a valid supported image"));
    };
    img.src = objectUrl;
  });
}
