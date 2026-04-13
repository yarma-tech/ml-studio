import { ReactNode } from "react";

export default function Card({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm ${className}`}>
      {title && <div className="px-4 py-3 border-b border-gray-100 text-sm font-heading font-bold text-gray-600">{title}</div>}
      <div className="p-4">{children}</div>
    </div>
  );
}
