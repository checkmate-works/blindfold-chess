export function ScrollIndicator() {
  return (
    <a
      href="#ai-battle"
      className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50 hover:opacity-100 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring rounded-full p-2"
      aria-label="Scroll to content"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 14l-7 7m0 0l-7-7m7 7V3"
        />
      </svg>
    </a>
  );
}
