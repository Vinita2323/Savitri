import { RotateCcw, Ban } from 'lucide-react';

/**
 * Informational return-policy tag for cart / checkout lines. It never blocks a purchase.
 * Shows nothing when the product's return setting is not known (older cached cart lines).
 */
export default function ReturnBadge({ item, className = '' }) {
  if (!item || item.isReturnable === undefined || item.isReturnable === null) return null;
  if (item.isReturnable === false) {
    return (
      <span data-testid="return-badge" data-returnable="false" className={`inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 ${className}`}>
        <Ban size={10} /> Non-returnable
      </span>
    );
  }
  const days = Number(item.returnWindow) > 0 ? Number(item.returnWindow) : 7;
  return (
    <span data-testid="return-badge" data-returnable="true" className={`inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 ${className}`}>
      <RotateCcw size={10} /> Returnable · {days} {days === 1 ? 'day' : 'days'}
    </span>
  );
}
