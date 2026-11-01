import React from 'react'

type Props = {
  term: string
  definition: string
}

const GlossaryTooltip: React.FC<Props> = ({ term, definition }) => {
  return (
    <span className="relative inline-block glossary-term">
      <span className="cursor-help border-b border-dotted border-primary pb-0.5 text-primary" aria-label={definition}>
        {term}
      </span>

      <div className="pointer-events-none absolute left-0 bottom-full mb-2 w-80 transform -translate-y-1/2 opacity-0 invisible transition-all duration-150 ease-in-out glossary-tooltip z-50">
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm p-3 rounded-lg shadow-lg border">
          <div className="font-semibold mb-1">{term}</div>
          <div className="text-sm leading-snug">{definition}</div>
        </div>
      </div>

      <style>{`
        .glossary-term:hover .glossary-tooltip { visibility: visible; opacity: 1; transform: translateY(0); pointer-events: auto; }
      `}</style>
    </span>
  )
}

export default GlossaryTooltip