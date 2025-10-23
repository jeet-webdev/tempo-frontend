import { useState } from 'react';

/**
 * Custom hook for managing selection state (checkboxes, multi-select)
 */
export function useSelection<T extends string = string>() {
  const [selectedIds, setSelectedIds] = useState<Set<T>>(new Set());

  const toggleSelection = (id: T) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = (ids: T[]) => {
    setSelectedIds(new Set(ids));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const toggleSelectAll = (ids: T[]) => {
    if (selectedIds.size === ids.length) {
      clearSelection();
    } else {
      selectAll(ids);
    }
  };

  const isSelected = (id: T) => selectedIds.has(id);

  return {
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    toggleSelectAll,
    isSelected,
    selectedCount: selectedIds.size,
  };
}
