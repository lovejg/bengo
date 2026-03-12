import { Building2, MapPin, Calendar } from 'lucide-react';

export interface PolicyMetaRowProps {
  agency?: string;
  region?: string;
  period?: string;
}

export function PolicyMetaRow({ agency, region, period }: PolicyMetaRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--muted-foreground)]">
      {agency && (
        <div className="flex items-center gap-1.5">
          <Building2 className="h-4 w-4" />
          <span>{agency}</span>
        </div>
      )}
      {region && (
        <div className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4" />
          <span>{region}</span>
        </div>
      )}
      {period && (
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          <span>{period}</span>
        </div>
      )}
    </div>
  );
}
