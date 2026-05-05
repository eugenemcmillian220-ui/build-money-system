'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { VisionResponse } from '../types';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_SIZE_MB = 5;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function HomePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<'idle' | 'analyzing' | 'crawling' | 'matching'>('idle');

  const handleFile = useCallback((f: File) => {
    setError(null);
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError('Please upload a JPEG, PNG, WebP, or HEIC image.');
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be smaller than ${MAX_SIZE_MB} MB.`);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      setStage('analyzing');
      const base64 = await fileToBase64(file);

      setStage('crawling');
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
      });

      setStage('matching');
      const data: VisionResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Vision analysis failed.');
      }

      // Persist to sessionStorage for results page
      sessionStorage.setItem('vibecart_results', JSON.stringify(data));
      router.push('/results');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
      setStage('idle');
    }
  };

  const STAGE_LABELS: Record<string, string> = {
    analyzing: '🔍 Analyzing room with AI Vision…',
    crawling: '🕷️ Crawling IKEA, Wayfair, West Elm, Crate & Barrel…',
    matching: '🎯 Matching furniture to your room vibe…',
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Background gradient blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-violet-600/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -right-32 h-[400px] w-[400px] rounded-full bg-fuchsia-600/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="mb-12 text-center">
          <span className="mb-4 inline-block rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-violet-300">
            AI-Powered Furniture Discovery
          </span>
          <h1 className="mt-4 text-5xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
            Snap your room.{' '}
            <span className="gradient-text">Find your furniture.</span>
          </h1>
          <p className="mt-5 text-lg text-neutral-400 max-w-2xl mx-auto">
            Upload any room photo and our AI instantly identifies furniture styles,
            then searches IKEA, Wayfair, West Elm and more to find your perfect match.
          </p>
        </div>

        {/* Upload Card */}
        <div className="card p-8 shadow-2xl shadow-violet-950/20">
          {/* Drop Zone */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload room photo"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
            onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={[
              'relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200',
              dragging
                ? 'drop-zone-active bg-violet-500/10 border-violet-400'
                : 'border-neutral-700 hover:border-violet-500 hover:bg-violet-500/5',
              preview ? 'h-72' : 'h-56',
            ].join(' ')}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              className="sr-only"
              onChange={onInputChange}
            />

            {preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Room preview"
                  className="h-full w-full rounded-2xl object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-sm font-semibold text-white">Click to change photo</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 text-neutral-500">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-800">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-neutral-300">
                    Drop your room photo here
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    JPEG, PNG, WebP, HEIC · Max {MAX_SIZE_MB} MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* File name */}
          {file && (
            <p className="mt-3 text-center text-xs text-neutral-500">
              📷 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
              ⚠️ {error}
            </div>
          )}

          {/* Loading stage */}
          {loading && stage !== 'idle' && (
            <div className="mt-4 rounded-xl border border-violet-800/40 bg-violet-900/20 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                <span className="text-sm text-violet-300">{STAGE_LABELS[stage]}</span>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
                  style={{
                    width:
                      stage === 'analyzing' ? '33%' :
                      stage === 'crawling' ? '66%' : '90%',
                  }}
                />
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleAnalyze}
            disabled={!file || loading}
            className="btn-primary mt-6 w-full text-base py-4"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Processing…
              </span>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Analyze Room with AI
              </>
            )}
          </button>
        </div>

        {/* Feature pills */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {[
            { icon: '🔍', label: 'AI Vision Detection' },
            { icon: '🏪', label: '4 Stores Crawled' },
            { icon: '📐', label: 'AR Preview' },
            { icon: '💳', label: 'Stripe Checkout' },
          ].map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-medium text-neutral-400"
            >
              <span>{f.icon}</span> {f.label}
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="mt-20">
          <h2 className="mb-8 text-center text-2xl font-bold text-white">How it works</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { step: '01', title: 'Upload a Room Photo', desc: 'Any room photo from your phone or computer. Our AI handles the rest.' },
              { step: '02', title: 'AI Detects Furniture', desc: 'Google Vision API identifies furniture type, style, and color palette in seconds.' },
              { step: '03', title: 'Shop Matching Products', desc: 'Browse curated matches from top stores with AR preview and one-click Stripe checkout.' },
            ].map((item) => (
              <div key={item.step} className="card p-6">
                <div className="mb-3 text-3xl font-black text-neutral-700">{item.step}</div>
                <h3 className="mb-2 font-semibold text-white">{item.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
