/**
 * 运维科技感 SVG 底图（标题栏背景装饰）
 * 电路走线 + 焊点 + 信号波形 + 蜂窝六边形 + 细网格，体现「运维/科技」语义，纯装饰（aria-hidden）。
 */
export function OpsTechBg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 440 180" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        {/* 细网格 */}
        <pattern id="ops-tech-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.15" />
        </pattern>
      </defs>

      <rect width="440" height="180" fill="url(#ops-tech-grid)" />

      {/* 电路走线（正交 + 45° 拐角） */}
      <g fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.5">
        <path d="M30 40 h40 l20 20 v30" />
        <path d="M120 30 v30 l15 15 h60" />
        <path d="M250 50 h30 l20 -20 v40" />
        <path d="M330 40 h60" />
        <path d="M60 130 h50 l20 -20 h80" />
        <path d="M230 150 h50 l15 -15 v-40" />
        <path d="M320 120 h40 l20 20 h30" />
        <path d="M150 90 h40 l15 15 h30 v20" />
        <path d="M395 60 v25 l-15 15" />
      </g>

      {/* 焊点（走线端点 / 节点） */}
      <g fill="currentColor" opacity="0.7">
        <circle cx="30" cy="40" r="2.5" />
        <circle cx="110" cy="90" r="2.5" />
        <circle cx="120" cy="30" r="2.5" />
        <circle cx="210" cy="75" r="2.5" />
        <circle cx="250" cy="50" r="2.5" />
        <circle cx="290" cy="70" r="2.5" />
        <circle cx="330" cy="40" r="2.5" />
        <circle cx="390" cy="40" r="2.5" />
        <circle cx="60" cy="130" r="2.5" />
        <circle cx="210" cy="130" r="2.5" />
        <circle cx="230" cy="150" r="2.5" />
        <circle cx="300" cy="95" r="2.5" />
        <circle cx="320" cy="120" r="2.5" />
        <circle cx="395" cy="140" r="2.5" />
        <circle cx="150" cy="90" r="2.5" />
        <circle cx="240" cy="125" r="2.5" />
        <circle cx="395" cy="60" r="2.5" />
        <circle cx="380" cy="100" r="2.5" />
      </g>

      {/* 数据信号波形 */}
      <g fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4">
        <path d="M300 30 l6 -6 6 6 6 -6 6 6 6 -6 6 6 6 -6 6 6 6 -6 6 6" />
        <path d="M55 55 l5 -5 5 5 5 -5 5 5 5 -5 5 5 5 -5 5 5" />
        <path d="M340 150 l5 -5 5 5 5 -5 5 5 5 -5 5 5" />
      </g>

      {/* 蜂窝六边形装饰 */}
      <g fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
        <path d="M30 18 l12 -7 12 7 v14 l-12 7 -12 -7 z" />
        <path d="M380 96 l12 -7 12 7 v14 l-12 7 -12 -7 z" />
        <path d="M408 56 l12 -7 12 7 v14 l-12 7 -12 -7 z" />
        <path d="M96 22 l10 -6 10 6 v12 l-10 6 -10 -6 z" />
      </g>
    </svg>
  )
}
