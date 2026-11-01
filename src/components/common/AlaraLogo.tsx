export default function AlaraLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 32" className={className} aria-hidden="true">
      <path d="M18 2 33 30h-8L18 16 11 30H3Z" fill="#fff" />
      <path d="M11.5 22.5c5-3.4 10.2-3.4 15 0l2.6 7.5c-6.6-4.9-13.6-4.9-20.2 0Z" fill="var(--color-gold)" />
    </svg>
  );
}
