'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, User2, File, Clock, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { globalSearchAction, saveRecentSearchAction, getRecentSearchesAction, clearRecentSearchesAction } from '@/app/actions/search-actions';
import { cn } from '@/lib/utils';

interface SearchResult {
  entity_type: 'transaction' | 'contact' | 'document';
  entity_id: string;
  title: string;
  subtitle: string | null;
  url: string;
  rank: number;
}

const entityIcons = {
  transaction: FileText,
  contact: User2,
  document: File,
};

const entityLabels = {
  transaction: 'Transaction',
  contact: 'Contact',
  document: 'Document',
};

export function SearchCommand() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<{ query: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Keyboard shortcut to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load recent searches when opening
  useEffect(() => {
    if (open && query === '') {
      getRecentSearchesAction().then((res) => {
        if (res.data) {
          setRecentSearches(res.data.map((s: any) => ({ query: s.query })));
        }
      });
    }
  }, [open, query]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await globalSearchAction(query);
      if (res.data) {
        setResults(res.data);
        setSelectedIndex(0);
      }
      setLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      saveRecentSearchAction(query, result.entity_type, result.entity_id);
      setOpen(false);
      setQuery('');
      router.push(result.url);
    },
    [query, router],
  );

  const handleRecentSearch = useCallback(
    (q: string) => {
      setQuery(q);
    },
    [],
  );

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-2 h-8 px-3 rounded-lg text-[13px]',
          'text-muted-foreground/60 bg-muted/40 border border-border/30',
          'hover:bg-muted/60 hover:text-muted-foreground transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/40 ml-4">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 max-w-[540px] gap-0 overflow-hidden">
          <div className="flex items-center gap-3 px-4 border-b border-border/40">
            <Search className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search transactions, contacts, documents..."
              className="h-12 border-0 shadow-none focus-visible:ring-0 text-[14px] px-0"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-muted-foreground/40 hover:text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto p-2">
            {loading && (
              <div className="px-3 py-6 text-center text-[13px] text-muted-foreground/60">
                Searching...
              </div>
            )}

            {!loading && query && results.length === 0 && (
              <div className="px-3 py-6 text-center text-[13px] text-muted-foreground/60">
                No results for &ldquo;{query}&rdquo;
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="space-y-0.5">
                {results.map((result, idx) => {
                  const Icon = entityIcons[result.entity_type];
                  return (
                    <button
                      key={`${result.entity_type}-${result.entity_id}`}
                      onClick={() => handleSelect(result)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left',
                        'transition-colors duration-100',
                        idx === selectedIndex
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-muted/50',
                      )}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/60 shrink-0">
                        <Icon className="h-4 w-4 text-muted-foreground/70" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate">{result.title}</p>
                        <p className="text-[11px] text-muted-foreground/60 truncate">
                          {entityLabels[result.entity_type]}
                          {result.subtitle && ` · ${result.subtitle}`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {!loading && !query && recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/50">
                    Recent Searches
                  </span>
                  <button
                    onClick={() => {
                      clearRecentSearchesAction();
                      setRecentSearches([]);
                    }}
                    className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-0.5">
                  {recentSearches.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRecentSearch(s.query)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-muted/50 transition-colors"
                    >
                      <Clock className="h-3.5 w-3.5 text-muted-foreground/40" />
                      <span className="text-[13px] text-muted-foreground/70">{s.query}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!loading && !query && recentSearches.length === 0 && (
              <div className="px-3 py-6 text-center text-[13px] text-muted-foreground/60">
                Start typing to search across your workspace
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-2 border-t border-border/30 bg-muted/20">
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground/40">
              <span><kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">↑↓</kbd> Navigate</span>
              <span><kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">↵</kbd> Open</span>
              <span><kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">Esc</kbd> Close</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
