// src/components/dashboard/DeliverableDownloader.tsx
'use client';

import { Download, Share2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DeliverableDownloaderProps {
  jobId: string;
  deliverableUrl: string | null;
  totalPhases: number;
  completedPhases: number[];
  productName: string;
}

const FOLDERS = [
  { name: 'Spec & Research',  phases: [0, 1, 2] },
  { name: 'Architecture',     phases: [3, 4, 5, 6] },
  { name: 'Implementation',   phases: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16] },
  { name: 'Quality & Errors', phases: [17, 18] },
  { name: 'DevOps',           phases: [19, 20] },
  { name: 'Documentation',    phases: [21, 22] },
  { name: 'Launch',           phases: [23, 24] },
];

export function DeliverableDownloader({
  jobId,
  deliverableUrl,
  totalPhases,
  completedPhases,
  productName,
}: DeliverableDownloaderProps) {
  const handleDownload = () => {
    if (!deliverableUrl) return;
    window.open(deliverableUrl, '_blank');
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/dashboard/projects?job=${jobId}`;
    await navigator.clipboard.writeText(url);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />
          <CardTitle className="text-base">{productName} — Complete</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          {completedPhases.length}/{totalPhases} phases completed. All outputs compiled into a downloadable package.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {FOLDERS.map((folder) => {
            const done = folder.phases.filter((p) => completedPhases.includes(p)).length;
            return (
              <div key={folder.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-sm">
                <span className="text-muted-foreground text-xs">{folder.name}</span>
                <Badge variant={done === folder.phases.length ? 'default' : 'secondary'} className="text-xs">
                  {done}/{folder.phases.length}
                </Badge>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleDownload}
            disabled={!deliverableUrl}
            className="flex-1 gap-2"
            aria-label="Download deliverable package"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download Package
          </Button>
          <Button onClick={handleShare} variant="outline" className="gap-2" aria-label="Copy share link">
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Share
          </Button>
        </div>

        {!deliverableUrl && (
          <p className="text-xs text-muted-foreground text-center">
            Package is being compiled… refresh in a moment.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
