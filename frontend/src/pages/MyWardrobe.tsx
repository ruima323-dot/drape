import { useEffect, useState, useCallback } from 'react';
import type { WardrobeItem } from '@drape/shared';
import { api } from '../lib/api';
import WardrobeTextInput from '../components/wardrobe/WardrobeTextInput';
import WardrobeGroupedView from '../components/wardrobe/WardrobeGroupedView';
import WardrobeEmptyState from '../components/wardrobe/WardrobeEmptyState';
import ViewToggle from '../components/wardrobe/ViewToggle';
import DailyPick from '../components/wardrobe/DailyPick';

export default function MyWardrobe() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'category' | 'color'>('category');

  const fetchItems = useCallback(async () => {
    try {
      const data = await api.get<{ items: WardrobeItem[] }>('/wardrobe');
      setItems(data.items ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wardrobe items.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleItemsAdded = (newItems: WardrobeItem[]) => {
    setItems((prev) => [...newItems, ...prev]);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/wardrobe/items/${id}`);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item.');
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-display font-semibold text-charcoal">
        My Wardrobe
      </h1>

      {/* Daily Pick */}
      <DailyPick />

      <div className="drape-card">
        <WardrobeTextInput onItemsAdded={handleItemsAdded} />
      </div>

      {!isLoading && !error && items.length > 0 && (
        <ViewToggle activeView={viewMode} onViewChange={setViewMode} />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="flex items-center gap-3 text-charcoal-muted">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>Loading wardrobe...</span>
          </div>
        </div>
      ) : error ? (
        <div className="drape-card text-center py-8">
          <p className="text-red-600 mb-3">{error}</p>
          <button
            onClick={() => {
              setIsLoading(true);
              setError(null);
              fetchItems();
            }}
            className="text-sm text-gold hover:text-gold-muted underline"
          >
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <WardrobeEmptyState />
      ) : (
        <WardrobeGroupedView items={items} groupBy={viewMode} onDelete={handleDelete} />
      )}
    </div>
  );
}
