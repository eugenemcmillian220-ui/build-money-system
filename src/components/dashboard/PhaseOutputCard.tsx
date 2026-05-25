// src/components/dashboard/PhaseOutputCard.tsx
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PhaseOutputCardProps {
  phaseIndex: number;
  phaseName: string;
  agentId: string;
  output: string;
  isStreaming?: boolean;
}

export function PhaseOutputCard({
  phaseIndex,
  phaseName,
  agentId,
  output,
  isStreaming = false,
}: PhaseOutputCardProps) {
  const [expanded, setExpanded] = useState(phaseIndex < 3);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors"
        aria-expanded={expanded}
        aria-controls={`phase-output-${phaseIndex}-${agentId}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground w-6">{String(phaseIndex + 1).padStart(2, '0')}</span>
          <span className="text-sm font-medium">{phaseName}</span>
          <Badge variant="secondary" className="text-xs">{agentId}</Badge>
          {isStreaming && <Loader2 className="h-3 w-3 animate-spin text-blue-500" aria-label="Streaming" />}
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        }
      </button>

      {expanded && (
        <div className="relative" id={`phase-output-${phaseIndex}-${agentId}`}>
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-muted transition-colors"
            title="Copy output"
            aria-label="Copy output to clipboard"
          >
            {copied
              ? <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
              : <Copy className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            }
          </button>
          <pre className="px-4 py-4 text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto leading-relaxed">
            {output}
            {isStreaming && <span className="animate-pulse" aria-hidden="true">▊</span>}
          </pre>
        </div>
      )}
    </div>
  );
}
