// Per-device "pinned to home" module list for the Menu's Quick Access section - a personal
// convenience, not synced data, so localStorage is the right place for it (see Menu.tsx).
const STORAGE_KEY = 'bahis.pinnedModuleIds';

export const getPinnedModuleIds = (): number[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((id) => Number.isInteger(id)) : [];
    } catch {
        return [];
    }
};

export const togglePinnedModuleId = (id: number): number[] => {
    const current = getPinnedModuleIds();
    const next = current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id];
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        // localStorage can throw in restricted contexts (e.g. disabled site data) - pinning is a
        // convenience, not something that should break the menu if it fails.
    }
    return next;
};

// Drag-to-reorder: put `id` just before or just after `targetId`. The stored order is the order Favorites shows.
export const movePinnedModuleId = (id: number, targetId: number, side: 'before' | 'after'): number[] => {
    const current = getPinnedModuleIds();
    if (id === targetId || !current.includes(id) || !current.includes(targetId)) return current;

    const next = current.filter((existing) => existing !== id);
    const targetIndex = next.indexOf(targetId);
    next.splice(side === 'before' ? targetIndex : targetIndex + 1, 0, id);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        // see togglePinnedModuleId - non-fatal if this fails.
    }
    return next;
};

export const clearPinnedModuleIds = (): number[] => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // see togglePinnedModuleId - non-fatal if this fails.
    }
    return [];
};
