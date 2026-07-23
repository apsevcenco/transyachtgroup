export function VehicleThumb({ image, size = 32 }: { image: string | null; size?: number }) {
  return image ? (
    <img src={image} alt="" className="rounded object-cover shrink-0" style={{ width: size, height: size }} />
  ) : (
    <div className="rounded bg-white/[0.06] shrink-0" style={{ width: size, height: size }} />
  );
}
