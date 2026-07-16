import { useState, useRef, useEffect } from 'react';

const POPULAR_BRANDS = [
  'Aritzia',
  'Zara',
  'H&M',
  'Uniqlo',
  'COS',
  'Nike',
  'Adidas',
  'Lululemon',
  'Everlane',
  'Mango',
  'Massimo Dutti',
  'Ralph Lauren',
  'Calvin Klein',
  'Tommy Hilfiger',
  'Gap',
  'Banana Republic',
  'J.Crew',
  'Club Monaco',
  'AllSaints',
  'Reiss',
  'Theory',
  'Vince',
  'Sandro',
  'Maje',
  'Acne Studios',
  'A.P.C.',
  'Comme des Garçons',
  'Maison Margiela',
  'Jacquemus',
  'The Row',
  'Totême',
  'Reformation',
  'Abercrombie & Fitch',
  'Anthropologie',
  'Free People',
  'Urban Outfitters',
  'Levi\'s',
  'Carhartt',
  'Stüssy',
  'Supreme',
  'Off-White',
  'Fear of God',
  'Essentials',
  'New Balance',
  'ASICS',
  'Converse',
  'Vans',
  'Dr. Martens',
  'Birkenstock',
  'Gucci',
  'Prada',
  'Saint Laurent',
  'Bottega Veneta',
  'Balenciaga',
  'Burberry',
  'Versace',
  'Dior',
  'Louis Vuitton',
  'Chanel',
  'Hermès',
  'Celine',
  'Loewe',
  'Arc\'teryx',
  'Patagonia',
  'The North Face',
  'Columbia',
  'Canada Goose',
  'Muji',
  'ASOS',
  'Nordstrom',
  'Oak + Fort',
  'Wilfred',
  'Babaton',
  'Sunday Best',
  'Skims',
  'Alo Yoga',
  'Gymshark',
  'Under Armour',
  'Puma',
  'Reebok',
  'Coach',
  'Kate Spade',
  'Michael Kors',
  'Tory Burch',
  'Ted Baker',
  'Hugo Boss',
  'Lacoste',
  'Fred Perry',
  'Stone Island',
  'Moncler',
  'Barbour',
  'Scotch & Soda',
  'Cos',
  '& Other Stories',
  'Arket',
  'Weekday',
  'Monki',
];

// Deduplicate (case-insensitive)
const BRANDS = [...new Map(POPULAR_BRANDS.map((b) => [b.toLowerCase(), b])).values()];

interface BrandAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function BrandAutocomplete({ value, onChange, placeholder }: BrandAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = value.trim().length > 0
    ? BRANDS.filter((b) => b.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
    : [];

  const showDropdown = isOpen && filtered.length > 0;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const selectBrand = (brand: string) => {
    onChange(brand);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => (i < filtered.length - 1 ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => (i > 0 ? i - 1 : filtered.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0) {
        selectBrand(filtered[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded-card border border-cream-400 bg-white px-3 py-2.5 text-charcoal text-sm focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-controls="brand-suggestions"
      />
      {showDropdown && (
        <ul
          ref={listRef}
          id="brand-suggestions"
          role="listbox"
          className="absolute z-10 mt-1 w-full bg-white border border-cream-300 rounded-card shadow-lg max-h-48 overflow-y-auto"
        >
          {filtered.map((brand, i) => (
            <li
              key={brand}
              role="option"
              aria-selected={i === highlightedIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                selectBrand(brand);
              }}
              onMouseEnter={() => setHighlightedIndex(i)}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                i === highlightedIndex
                  ? 'bg-cream-100 text-charcoal'
                  : 'text-charcoal-muted hover:bg-cream-50'
              }`}
            >
              {brand}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
