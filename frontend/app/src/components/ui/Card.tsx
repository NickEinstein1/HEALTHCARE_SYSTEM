import React from 'react';
import './Card.css';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  variant?: 'default' | 'elevated' | 'ai' | 'danger';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  title,
  subtitle,
  icon,
  action,
  variant = 'default',
}) => {
  return (
    <div
      className={`card card-${variant} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {(title || icon || action) && (
        <div className="card-hd">
          <div className="card-title-group">
            {icon && <span className="card-icon">{icon}</span>}
            <div>
              {title && <div className="card-ttl">{title}</div>}
              {subtitle && <div className="card-sub">{subtitle}</div>}
            </div>
          </div>
          {action && <div className="card-action">{action}</div>}
        </div>
      )}
      <div className="card-content">{children}</div>
    </div>
  );
};
