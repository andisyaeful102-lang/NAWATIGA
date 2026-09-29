import React from 'react';

export interface NawatigaLogoProps {
  /**
   * 'dark': for dark backgrounds (Obsidian/Zinc-950). Warm gold-amber accents, subtle ambient glow, perfectly matching dark theme.
   * 'light': for thermal receipt paper and white backgrounds. Crisp minimalist charcoal-black lines, printer-friendly.
   * 'gold': pure metallic gold gradient styling.
   * 'monochrome': inherits currentColor for flexible styling.
   */
  variant?: 'dark' | 'light' | 'gold' | 'monochrome';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  showText?: boolean;
  textPosition?: 'bottom' | 'right';
  className?: string;
}

export const NawatigaLogo: React.FC<NawatigaLogoProps> = ({
  variant = 'dark',
  size = 'md',
  showText = false,
  textPosition = 'bottom',
  className = '',
}) => {
  // Dimension mapping
  const sizeMap: Record<string, { box: string; px: number; textSize: string; subSize: string }> = {
    xs: { box: 'w-6 h-6', px: 24, textSize: 'text-xs', subSize: 'text-[8px]' },
    sm: { box: 'w-8 h-8', px: 32, textSize: 'text-sm', subSize: 'text-[9px]' },
    md: { box: 'w-11 h-11', px: 44, textSize: 'text-base', subSize: 'text-[10px]' },
    lg: { box: 'w-14 h-14', px: 56, textSize: 'text-lg', subSize: 'text-xs' },
    xl: { box: 'w-20 h-20', px: 80, textSize: 'text-2xl', subSize: 'text-sm' },
  };

  const currentSize = typeof size === 'number' 
    ? { box: '', px: size, textSize: 'text-base', subSize: 'text-[10px]' } 
    : sizeMap[size] || sizeMap.md;

  const customStyle = typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : undefined;

  // Aesthetic Color schemes matching each background context
  const isDark = variant === 'dark';
  const isLight = variant === 'light';
  const isGold = variant === 'gold';

  return (
    <div
      className={`inline-flex items-center ${
        textPosition === 'bottom' ? 'flex-col gap-1.5' : 'flex-row gap-3'
      } ${className}`}
    >
      {/* Emblem SVG Icon */}
      <div
        className={`relative flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${currentSize.box}`}
        style={customStyle}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            {/* Dark Mode Gradient: Warm Golden Amber matching dark obsidian */}
            <linearGradient id="nawatiga-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            <linearGradient id="nawatiga-glow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.8" />
            </linearGradient>

            {/* Subtle glow filter for dark theme */}
            <filter id="nawatiga-soft-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#f59e0b" floodOpacity="0.35" />
            </filter>
          </defs>

          {/* SVG Group with styling */}
          <g
            stroke={
              isLight
                ? '#18181b'
                : isGold || isDark
                ? 'url(#nawatiga-gold-grad)'
                : 'currentColor'
            }
            filter={isDark ? 'url(#nawatiga-soft-glow)' : undefined}
          >
            {/* Outer Circular Ring with opening at the top left for leaves */}
            <path
              d="M 33 26 A 40 40 0 1 1 58 14"
              strokeWidth={isLight ? "2.6" : "2.4"}
              strokeLinecap="round"
            />

            {/* Coffee Leaves Sprouting from top-left rim */}
            {/* Leaf 1: Upper large leaf */}
            <path
              d="M 34 26 C 24 10, 42 4, 52 11 C 56 18, 48 25, 34 26 Z"
              fill={isLight ? '#18181b' : isDark ? 'url(#nawatiga-gold-grad)' : 'currentColor'}
              strokeWidth="0.5"
            />
            {/* Center vein of Leaf 1 */}
            <path
              d="M 35 25 Q 43 16 51 12"
              stroke={isLight ? '#ffffff' : '#18181b'}
              strokeWidth="1.2"
              strokeLinecap="round"
            />

            {/* Leaf 2: Lateral leaf pointing left */}
            <path
              d="M 31 32 C 16 28, 14 16, 23 14 C 30 15, 33 23, 31 32 Z"
              fill={isLight ? '#18181b' : isDark ? 'url(#nawatiga-gold-grad)' : 'currentColor'}
              strokeWidth="0.5"
            />
            <path
              d="M 31 31 Q 23 23 23 15"
              stroke={isLight ? '#ffffff' : '#18181b'}
              strokeWidth="1.2"
              strokeLinecap="round"
            />

            {/* Leaf 3: Small accent leaf pointing downward */}
            <path
              d="M 28 39 C 18 41, 19 49, 25 48 C 30 46, 30 42, 28 39 Z"
              fill={isLight ? '#18181b' : isDark ? 'url(#nawatiga-gold-grad)' : 'currentColor'}
              strokeWidth="0.5"
            />

            {/* Leaf 4: Tiny accent bud on right side */}
            <path
              d="M 59 14 C 64 8, 71 11, 70 17 C 67 20, 62 18, 59 14 Z"
              fill={isLight ? '#18181b' : isDark ? 'url(#nawatiga-gold-grad)' : 'currentColor'}
              strokeWidth="0.5"
            />

            {/* Coffee Terrace / Aroma Wave Contours (Inside lower hemisphere) */}
            {/* Wave 1: Top contour */}
            <path
              d="M 17 56 C 28 50, 42 62, 54 54 C 66 47, 76 54, 84 50"
              strokeWidth={isLight ? "2.4" : "2.2"}
              strokeLinecap="round"
            />

            {/* Wave 2: Second contour */}
            <path
              d="M 13 65 C 26 59, 41 71, 55 63 C 68 56, 78 63, 87 59"
              strokeWidth={isLight ? "2.4" : "2.2"}
              strokeLinecap="round"
            />

            {/* Wave 3: Third contour */}
            <path
              d="M 16 74 C 29 69, 43 79, 57 72 C 70 66, 79 72, 85 68"
              strokeWidth={isLight ? "2.4" : "2.2"}
              strokeLinecap="round"
            />

            {/* Wave 4: Bottom base contour */}
            <path
              d="M 24 82 C 34 78, 46 86, 59 80 C 70 75, 75 79, 78 77"
              strokeWidth={isLight ? "2.4" : "2.2"}
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>

      {/* Optional Integrated Typography */}
      {showText && (
        <div className={`flex flex-col ${textPosition === 'bottom' ? 'items-center text-center' : 'items-start text-left'}`}>
          <span
            className={`font-extrabold tracking-[0.18em] uppercase ${
              isLight ? 'text-zinc-950 font-serif' : 'text-white font-serif-cafe drop-shadow-sm'
            } ${currentSize.textSize}`}
          >
            NAWATIGA
          </span>
          <span
            className={`tracking-wider italic ${
              isLight ? 'text-zinc-600 font-sans' : 'text-amber-300/90 font-sans'
            } ${currentSize.subSize}`}
          >
            by Rose Garden Coffee
          </span>
        </div>
      )}
    </div>
  );
};
