// src/components/dashboard/SpecValidationReport.tsx
'use client';

import { AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Assumption {
  key: string;
  value: string;
  recommended_default: string;
}

interface SpecValidationReportProps {
  confidence: number;
  blockers: string[];
  assumptions: Assumption[];
  onConfirm: (overrides: Record<string, string>) => void;
  onEdit: () => void;
}

export function SpecValidationReport({
  confidence,
  blockers,
  assumptions,
  onConfirm,
  onEdit,
}: SpecValidationReportProps) {
  const [overrides, setOverrides] = useState<Record<string, string>>(
    Object.fromEntries(assumptions.map((a) => [a.key, a.recommended_default]))
  );
  const [showAssumptions, setShowAssumptions] = useState(false);

  const isBlocked = confidence < 60 || blockers.length > 0;
  const confidenceColor = confidence >= 80 ? 'text-green-500' : confidence >= 60 ? 'text-amber-500' : 'text-red-500';

  return (
    <Card className="border-2 border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Spec Validation</CardTitle>
          <div className={`text-2xl font-bold ${confidenceColor}`} aria-label={`Confidence: ${confidence}%`}>{confidence}%</div>
        </div>
        <p className="text-sm text-muted-foreground">
          {confidence >= 80 ? 'Spec looks solid. Ready to build.' :
           confidence >= 60 ? 'Spec is workable but has gaps.' :
           'Spec needs clarification before the pipeline can run.'}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {blockers.length > 0 && (
          <div className="space-y-2" role="alert">
            <p className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" aria-hidden="true" /> Blockers
            </p>
            {blockers.map((b, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                {b}
              </div>
            ))}
          </div>
        )}

        {assumptions.length > 0 && (
          <div>
            <button
              onClick={() => setShowAssumptions((s) => !s)}
              className="flex items-center gap-2 text-sm font-medium w-full text-left"
              aria-expanded={showAssumptions}
            >
              <CheckCircle className="h-4 w-4 text-amber-500" aria-hidden="true" />
              {assumptions.length} assumption{assumptions.length !== 1 ? 's' : ''} detected
              {showAssumptions
                ? <ChevronUp className="h-4 w-4 ml-auto" aria-hidden="true" />
                : <ChevronDown className="h-4 w-4 ml-auto" aria-hidden="true" />
              }
            </button>

            {showAssumptions && (
              <div className="mt-3 space-y-3">
                {assumptions.map((a) => (
                  <div key={a.key} className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide" htmlFor={`assumption-${a.key}`}>
                      {a.key}
                    </label>
                    <input
                      id={`assumption-${a.key}`}
                      value={overrides[a.key] ?? a.recommended_default}
                      onChange={(e) => setOverrides((prev) => ({ ...prev, [a.key]: e.target.value }))}
                      className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background"
                    />
                    <p className="text-xs text-muted-foreground">Default: {a.recommended_default}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          {isBlocked ? (
            <Button onClick={onEdit} variant="default" className="flex-1">Edit Spec</Button>
          ) : (
            <Button onClick={() => onConfirm(overrides)} className="flex-1">Confirm & Start Pipeline</Button>
          )}
          {!isBlocked && (
            <Button onClick={onEdit} variant="outline">Edit</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
