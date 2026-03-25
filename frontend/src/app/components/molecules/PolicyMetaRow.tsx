import { Building2, MapPin, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PolicyMetaRowProps {
  agency?: string;
  region?: string;
  period?: string;
  periodClassName?: string;
  className?: string;
}

export function PolicyMetaRow({ agency, region, period, periodClassName, className }: PolicyMetaRowProps) {
  return (
    <div className={cn('flex items-center gap-4 text-sm text-[var(--muted-foreground)] overflow-hidden', className)}>
      {agency && (
        <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
          <Building2 className="h-4 w-4 flex-shrink-0" />
          <span className="truncate max-w-[160px]">{agency}</span>
        </div>
      )}
      {region && (
        <div className="flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span>{region}</span>
        </div>
      )}
      {period && (
        <div className={`flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap${periodClassName ? ` ${periodClassName}` : ''}`}>
          <Calendar className="h-4 w-4 flex-shrink-0" />
          <span>{period}</span>
        </div>
      )}
    </div>
  );
}
