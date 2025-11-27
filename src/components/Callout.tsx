import React from 'react'

type CalloutTone = 'info' | 'warning' | 'success'

type CalloutProps = {
  title?: string
  tone?: CalloutTone
  children: React.ReactNode
}

const toneDefaults: Record<CalloutTone, string> = {
  info: 'Note',
  warning: 'Heads up',
  success: 'Win',
}

const Callout: React.FC<CalloutProps> = ({ title, tone = 'info', children }) => {
  return (
    <div className={`callout callout-${tone}`}>
      <div className="callout-header">{title ?? toneDefaults[tone]}</div>
      <div className="callout-body">{children}</div>
    </div>
  )
}

export default Callout
