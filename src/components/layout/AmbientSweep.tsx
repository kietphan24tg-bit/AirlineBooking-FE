/** Decorative SVG sweep from stitch_plane Midnight Luxury theme. */
export default function AmbientSweep() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <svg
        className="absolute h-full w-full stroke-luxury-gold opacity-[0.2]"
        preserveAspectRatio="none"
        viewBox="0 0 1000 1000"
      >
        <path
          d="M-50,950 C200,850 400,900 600,600 C800,300 900,100 1100,50"
          fill="none"
          strokeWidth="0.75"
          style={{ filter: 'drop-shadow(0 0 2px rgba(212, 175, 55, 0.2))' }}
        />
      </svg>
    </div>
  );
}
