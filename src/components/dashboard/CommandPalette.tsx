// src/components/dashboard/CommandPalette.tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, FolderOpen, CreditCard, Settings,
  Plus, Users, BookOpen, Zap, Search,
} from 'lucide-react';

const NAV_COMMANDS = [
  { id: 'dashboard',  label: 'Dashboard',      icon: LayoutDashboard, href: '/dashboard' },
  { id: 'projects',   label: 'Projects',        icon: FolderOpen,      href: '/dashboard/projects' },
  { id: 'billing',    label: 'Billing',         icon: CreditCard,      href: '/dashboard/billing' },
  { id: 'settings',   label: 'Settings',        icon: Settings,        href: '/dashboard/settings' },
  { id: 'docs',       label: 'Documentation',   icon: BookOpen,        href: 'https://docs.sovereignforge.ai', external: true },
];

const ACTION_COMMANDS = [
  { id: 'new-pipeline', label: 'New Pipeline',   icon: Plus, action: 'new-pipeline' },
  { id: 'invite-user',  label: 'Invite User',    icon: Users, action: 'invite-user' },
  { id: 'top-up',       label: 'Top Up Credits', icon: Zap,  action: 'top-up' },
];

interface CommandItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  external?: boolean;
  action?: string;
}

interface CommandPaletteProps {
  onAction?: (action: string) => void;
}

export function CommandPalette({ onAction }: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const allCommands: (CommandItem & { group: string })[] = [
    ...NAV_COMMANDS.map((c) => ({ ...c, group: 'Navigation' })),
    ...ACTION_COMMANDS.map((c) => ({ ...c, group: 'Actions' })),
  ];

  const filtered = query
    ? allCommands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : allCommands;

  const navFiltered = filtered.filter((c) => c.group === 'Navigation');
  const actionFiltered = filtered.filter((c) => c.group === 'Actions');

  const handleSelect = (item: CommandItem) => {
    setOpen(false);
    setQuery('');
    if (item.href) {
      if (item.external) window.open(item.href, '_blank');
      else router.push(item.href);
    } else if (item.action) {
      onAction?.(item.action);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-xl bg-background border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-border px-4 py-3 gap-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search commands"
          />
          <kbd className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2" role="listbox">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No results found.</p>
          ) : (
            <>
              {navFiltered.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1">Navigation</p>
                  {navFiltered.map((cmd) => (
                    <button
                      key={cmd.id}
                      onClick={() => handleSelect(cmd)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm hover:bg-accent transition-colors text-left"
                      role="option"
                    >
                      <cmd.icon className="h-4 w-4 text-muted-foreground" />
                      <span>{cmd.label}</span>
                    </button>
                  ))}
                </div>
              )}
              {actionFiltered.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1 mt-1">Actions</p>
                  {actionFiltered.map((cmd) => (
                    <button
                      key={cmd.id}
                      onClick={() => handleSelect(cmd)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm hover:bg-accent transition-colors text-left"
                      role="option"
                    >
                      <cmd.icon className="h-4 w-4 text-muted-foreground" />
                      <span>{cmd.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-border px-4 py-2 flex gap-4 text-xs text-muted-foreground">
          <span><kbd className="border border-border rounded px-1">↑↓</kbd> navigate</span>
          <span><kbd className="border border-border rounded px-1">↵</kbd> select</span>
          <span><kbd className="border border-border rounded px-1">ESC</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
