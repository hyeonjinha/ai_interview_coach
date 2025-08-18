'use client';

import React from 'react';

interface ProgressProps {
  value: number; // 0-100
  className?: string;
  children?: React.ReactNode;
}

export function Progress({ value, className = '', children }: ProgressProps) {
  return (
    <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${className}`}>
      {children ? (
        children
      ) : (
        <div 
          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      )}
    </div>
  );
}