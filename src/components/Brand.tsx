import React from 'react';

/** The existing sanctuary mark, paired with a consistent editorial wordmark. */
export const Brand: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <span className={`sanctra-brand ${compact ? 'sanctra-brand-compact' : ''}`}>
    <span className="sanctra-brand-mark"><img src="/logo.v2.png" alt="" width="36" height="36" /></span>
    <span className="sanctra-wordmark">sanctra<span className="sanctra-brand-period">.</span></span>
  </span>
);
