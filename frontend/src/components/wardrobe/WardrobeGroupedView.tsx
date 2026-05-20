import { useState } from 'react';
import type { WardrobeItem } from '@drape/shared';
import WardrobeItemCard from './WardrobeItemCard';

interface WardrobeGroupedViewProps {
  items: WardrobeItem[];
  groupBy: 'category' | 'color';
  onDelete: (id: string) => void;
}

const CATEGORY_MAP: Record<string, string[]> = {
  Tops: ['shirt', 'blouse', 't-shirt', 'polo', 'tank top', 'sweater', 'hoodie'],
  Bottoms: ['pants', 'jeans', 'trousers', 'shorts', 'skirt'],
  Outerwear: ['jacket', 'coat', 'blazer', 'cardigan', 'vest'],
  'Dresses & Suits': ['dress', 'suit'],
  Shoes: [
    'sneakers',
    'boots',
    'loafers',
    'sandals',
    'heels',
    'flats',
    'oxfords',
    'running shoes',
    'dress shoes',
    'slides',
  ],
  Accessories: [
    'necklace',
    'earrings',
    'bracelet',
    'watch',
    'ring',
    'hat',
    'scarf',
    'belt',
    'sunglasses',
    'brooch',
    'anklet',
    'cufflinks',
    'tie',
    'bow tie',
    'headband',
    'hair clip',
    'pendant',
    'bag',
    'purse',
    'clutch',
  ],
};

function getCategoryForItem(item: WardrobeItem): string {
  const type = item.type.toLowerCase().trim();
  for (const [category, types] of Object.entries(CATEGORY_MAP)) {
    if (types.includes(type)) {
      return category;
    }
  }
  return 'Other';
}

function groupByCategory(items: WardrobeItem[]): Map<string, WardrobeItem[]> {
  const groups = new Map<string, WardrobeItem[]>();
  const categoryOrder = [...Object.keys(CATEGORY_MAP), 'Other'];

  for (const item of items) {
    const category = getCategoryForItem(item);
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(item);
  }

  // Return in defined order
  const ordered = new Map<string, WardrobeItem[]>();
  for (const category of categoryOrder) {
    if (groups.has(category)) {
      ordered.set(category, groups.get(category)!);
    }
  }
  return ordered;
}

function groupByColor(items: WardrobeItem[]): Map<string, WardrobeItem[]> {
  const groups = new Map<string, WardrobeItem[]>();

  for (const item of items) {
    const color = item.color.charAt(0).toUpperCase() + item.color.slice(1).toLowerCase();
    if (!groups.has(color)) {
      groups.set(color, []);
    }
    groups.get(color)!.push(item);
  }

  // Sort alphabetically
  const sorted = new Map(
    [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  );
  return sorted;
}

function CollapsibleSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left py-2 group"
        aria-expanded={isExpanded}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 text-charcoal-muted transition-transform duration-200 ${
            isExpanded ? 'rotate-0' : '-rotate-180'
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-sm font-medium text-charcoal-muted uppercase tracking-wide">
          {title} ({count})
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="pt-2 pb-4">{children}</div>
      </div>
    </div>
  );
}

export default function WardrobeGroupedView({
  items,
  groupBy,
  onDelete,
}: WardrobeGroupedViewProps) {
  const groups = groupBy === 'category' ? groupByCategory(items) : groupByColor(items);

  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([groupName, groupItems]) => (
        <CollapsibleSection key={groupName} title={groupName} count={groupItems.length}>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            role="list"
            aria-label={`${groupName} items`}
          >
            {groupItems.map((item) => (
              <div key={item.id} role="listitem">
                <WardrobeItemCard item={item} onDelete={onDelete} />
              </div>
            ))}
          </div>
        </CollapsibleSection>
      ))}
    </div>
  );
}
