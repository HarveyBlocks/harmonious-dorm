
import { useCallback, useEffect, useMemo, useState } from 'react';

export function useNotificationSelection(options: { filterKey: string; totalRowCount: number }) {
  const { filterKey, totalRowCount } = options;

  const [selectAll, setSelectAll] = useState(false);
  const [includeIds, setIncludeIds] = useState<Set<number>>(new Set());
  const [excludeIds, setExcludeIds] = useState<Set<number>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setSelectAll(false);
    setIncludeIds(new Set());
    setExcludeIds(new Set());
    setMenuOpen(false);
  }, [filterKey]);

  const toggleSelect = useCallback((id: number) => {
    if (selectAll) {
      setExcludeIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      return;
    }

    setIncludeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [selectAll]);

  const selectAllRows = useCallback(() => {
    setSelectAll(true);
    setIncludeIds(new Set());
    setExcludeIds(new Set());
  }, []);

  const clearSelection = useCallback(() => {
    setSelectAll(false);
    setIncludeIds(new Set());
    setExcludeIds(new Set());
  }, []);

  const isChecked = useCallback((id: number) => {
    return selectAll ? !excludeIds.has(id) : includeIds.has(id);
  }, [excludeIds, includeIds, selectAll]);

  const selectedCount = useMemo(() => {
    if (selectAll) return Math.max(totalRowCount - excludeIds.size, 0);
    return includeIds.size;
  }, [excludeIds.size, includeIds.size, selectAll, totalRowCount]);

  const selectionPayload = useMemo(() => {
    return {
      selectAll,
      ids: selectAll ? [...excludeIds] : [...includeIds],
    };
  }, [excludeIds, includeIds, selectAll]);

  return {
    menuOpen,
    setMenuOpen,
    isChecked,
    selectedCount,
    selectionPayload,
    toggleSelect,
    selectAllRows,
    clearSelection,
  };
}
