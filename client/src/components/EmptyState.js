import React from "react";

const DEFAULT_ICON = (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect x="6" y="8" width="28" height="24" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
    <path d="M13 15h14M13 20h10M13 25h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const EmptyState = ({ title, description, icon, action }) => (
  <div className="empty-state">
    <div className="empty-state-icon">{icon || DEFAULT_ICON}</div>
    <h4 className="empty-state-title">{title}</h4>
    {description ? <p className="empty-state-desc">{description}</p> : null}
    {action ? <div className="empty-state-action">{action}</div> : null}
  </div>
);

export default EmptyState;
