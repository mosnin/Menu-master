import { AtSign } from 'lucide-react';

interface MentionBadgeProps {
  count: number;
  className?: string;
}

export function MentionBadge({ count, className }: MentionBadgeProps) {
  if (count <= 0) return null;

  const display = count > 99 ? '99+' : String(count);

  return (
    <span
      className={`relative inline-flex items-center justify-center ${className ?? ''}`}
      aria-label={`${count} unread mention${count === 1 ? '' : 's'}`}
    >
      <AtSign className="h-4 w-4 text-muted-foreground" />
      <span className="absolute -right-2 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold leading-none text-white shadow-sm">
        {display}
      </span>
    </span>
  );
}
