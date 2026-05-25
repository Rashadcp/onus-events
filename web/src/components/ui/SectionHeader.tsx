import React from 'react';

interface SectionHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function SectionHeader({ title, description, children }: SectionHeaderProps) {
  return (
    <div className="flex justify-between items-end mb-6 w-full">
      <div>
        <h2 className="text-2xl font-bold text-[#0F172A]">{title}</h2>
        {description && (
          <p className="text-slate-500 text-sm mt-1">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex gap-3 items-center">
          {children}
        </div>
      )}
    </div>
  );
}
