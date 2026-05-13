export function Logo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      {/* outer stadium bowl */}
      <ellipse cx="32" cy="34" rx="26" ry="14" />
      {/* inner field */}
      <ellipse cx="32" cy="34" rx="14" ry="7" />
      {/* center line */}
      <line x1="32" y1="27" x2="32" y2="41" />
      {/* floodlights */}
      <line x1="10" y1="20" x2="10" y2="12" />
      <line x1="54" y1="20" x2="54" y2="12" />
      <circle cx="10" cy="10" r="2" fill="#ffffff" stroke="none" />
      <circle cx="54" cy="10" r="2" fill="#ffffff" stroke="none" />
    </svg>
  );
}
