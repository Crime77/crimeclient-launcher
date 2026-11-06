/** A faint 1 px grid over the page background, fading out towards the bottom. */
export function GridBackground({ size = 32 }: { size?: number }) {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(255,255,255,0.028) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.028) 1px, transparent 1px)",
        backgroundSize: `${size}px ${size}px`,
        maskImage: "linear-gradient(to bottom, #000 0%, rgba(0,0,0,0.35) 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, #000 0%, rgba(0,0,0,0.35) 100%)",
      }}
    />
  );
}
