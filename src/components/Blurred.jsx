import React from 'react'

export function Blurred({ children, hidden }) {
  return (
    <span style={{
      filter: hidden ? 'blur(7px)' : 'none',
      transition: 'filter 0.2s',
      userSelect: hidden ? 'none' : 'auto',
      display: 'inline-block',
    }}>{children}</span>
  )
}
