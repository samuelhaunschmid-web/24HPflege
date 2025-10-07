import React from 'react'

type Props = {
  count: number
  title?: string
}

export default function CountBadge({ count, title }: Props) {
  return (
    <div title={title || String(count)} style={{ position: 'absolute', right: 10, top: 15 }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: '#0f172a',
        color: '#fff',
        padding: '6px 10px',
        borderRadius: 999,
        fontWeight: 700,
        fontSize: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2.4c-3.3 0-9.8 1.7-9.8 5v2.4h19.6v-2.4c0-3.3-6.5-5-9.8-5z"/>
        </svg>
        <span>{count}</span>
      </div>
    </div>
  )
}



