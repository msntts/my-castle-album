export function Mascot() {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 900,
        width: 88,
        height: 88,
        pointerEvents: 'none',
      }}
    >
      <svg viewBox="0 0 88 88" xmlns="http://www.w3.org/2000/svg">
        {/* 城の天守閣帽子 */}
        <rect x="30" y="6" width="28" height="4" rx="1" fill="#3d2b1f" />
        <rect x="34" y="2" width="20" height="7" rx="1" fill="#5a3d28" />
        <rect x="36" y="0" width="16" height="4" rx="1" fill="#3d2b1f" />
        <rect x="30" y="9" width="28" height="10" rx="1" fill="#7a5538" />
        {/* 耳 */}
        <ellipse cx="24" cy="30" rx="8" ry="10" fill="#e8c48a" />
        <ellipse cx="64" cy="30" rx="8" ry="10" fill="#e8c48a" />
        <ellipse cx="24" cy="30" rx="5" ry="7" fill="#d4956a" />
        <ellipse cx="64" cy="30" rx="5" ry="7" fill="#d4956a" />
        {/* 頭 */}
        <ellipse cx="44" cy="42" rx="22" ry="20" fill="#f5d5a8" />
        {/* 目 */}
        <circle cx="36" cy="39" r="4.5" fill="#1a1a1a" />
        <circle cx="52" cy="39" r="4.5" fill="#1a1a1a" />
        <circle cx="37.2" cy="37.5" r="1.8" fill="white" />
        <circle cx="53.2" cy="37.5" r="1.8" fill="white" />
        {/* 鼻 */}
        <ellipse cx="44" cy="47" rx="5.5" ry="4" fill="#2a1a0a" />
        {/* 口 */}
        <path d="M39.5 51 Q44 56 48.5 51" stroke="#2a1a0a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* ほっぺ */}
        <ellipse cx="28" cy="45" rx="6" ry="4" fill="#ffb3b3" opacity="0.45" />
        <ellipse cx="60" cy="45" rx="6" ry="4" fill="#ffb3b3" opacity="0.45" />
        {/* 体 */}
        <ellipse cx="44" cy="73" rx="20" ry="14" fill="#f5d5a8" />
      </svg>
    </div>
  );
}
