'use client';

/**
 * Full-size overlay shown when a file is dragged over the editor.
 * Uses an SVG dashed border with a marching-ants animation.
 */
export function DropOverlay({ visible }) {
  return (
    <div
      className={`absolute inset-0 z-50 flex items-center justify-center
        rounded-lg transition-all duration-300 pointer-events-none
        ${visible
          ? 'opacity-100 scale-100 bg-accent/5 backdrop-blur-[2px]'
          : 'opacity-0 scale-95'
        }`}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="4" y="4"
          width="calc(100% - 8px)" height="calc(100% - 8px)"
          rx="12" ry="12"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          className="drop-overlay-border"
        />
      </svg>

      <div className="relative z-10 text-center">
        <svg
          className="mx-auto mb-3 h-12 w-12 text-accent"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"
        >
          <path
            strokeLinecap="round" strokeLinejoin="round"
            d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
          />
        </svg>
        <p className="text-accent font-semibold text-lg">
          Glissez votre fichier ici
        </p>
        <p className="mt-1 text-sm text-dark-grey">
          Accepte les fichiers .docx et .txt
        </p>
      </div>
    </div>
  );
}
