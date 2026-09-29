import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Collapse,
    Dialog,
    DialogContent,
    DialogTitle,
    Grid,
    Icon,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import { Close as CloseIcon, ExpandLess, ExpandMore, InfoOutlined, PushPin, PushPinOutlined } from '@mui/icons-material';
import React, { useEffect, useState } from 'react';
import { log } from '../../helpers/log';
import { ipc } from '../../helpers/ipc';
import { VetBackground } from '../common/VetBackground';
import { alpha } from '@mui/material/styles';
import { Link, useParams } from 'react-router-dom';
import {
    clearPinnedModuleIds,
    getPinnedModuleIds,
    movePinnedModuleId,
    togglePinnedModuleId,
} from '../../helpers/pinnedModules.ts';

enum MenuItemTypes {
    form = 1,
    list,
    module,
    iframe,
    submitted,
    dashboard,
}

interface MenuItem {
    id: number;
    title: string;
    icon: string;
    description: string | null;
    sort_order: number;
    parent_module: number;
    module_type: MenuItemTypes;
    form: number | null;
    external_url: string | null;
}

const menuItemColors: Partial<Record<MenuItemTypes, string>> = {
    [MenuItemTypes.form]: '#00897B', // teal
    [MenuItemTypes.list]: '#4C51BF', // indigo
    [MenuItemTypes.dashboard]: '#6e1706', // purple
    [MenuItemTypes.iframe]: '#546E7A', // slate
    [MenuItemTypes.submitted]: '#00838F', // deep cyan
};

// Shown bottom-right on every tile except a folder (module_type === module), which shows its item
// count there instead - so a tile always says at a glance what kind of thing it is.
const menuItemTypeLabels: Partial<Record<MenuItemTypes, string>> = {
    [MenuItemTypes.form]: 'Form',
    [MenuItemTypes.list]: 'List',
    [MenuItemTypes.dashboard]: 'Dashboard',
    [MenuItemTypes.iframe]: 'Link',
    [MenuItemTypes.submitted]: 'Submitted',
};

interface MenuButtonProps {
    menuItem: MenuItem;
    isPinned?: boolean;
    onTogglePin?: (id: number) => void;
    compact?: boolean;
    // Links are draggable by default, and dragging one drags the URL rather than the tile - set this when a
    // wrapper around the tile is the drag source.
    noLinkDrag?: boolean;
    // How many modules/forms/etc. sit directly inside this one - only meaningful (and only passed) for a
    // folder tile (module_type === module), shown as a small badge on its icon.
    childCount?: number;
}

export default function MenuButton(props: MenuButtonProps) {
    const { compact = false } = props;
    const accent = menuItemColors[props.menuItem.module_type];
    let url = '';
    if (props.menuItem.module_type === MenuItemTypes.module) {
        url = `/menu/${props.menuItem.id}/`;
    } else if (props.menuItem.module_type === MenuItemTypes.list) {
        url = `/list/${props.menuItem.form}/`;
    } else if (props.menuItem.module_type === MenuItemTypes.form) {
        url = `/form/${props.menuItem.form}/`;
    } else if (props.menuItem.module_type === MenuItemTypes.iframe) {
        url = `/iframe?url=${props.menuItem.external_url}`;
    } else if (props.menuItem.module_type === MenuItemTypes.submitted) {
        url = `/formlist/${props.menuItem.form}/`;
    } else if (props.menuItem.module_type === MenuItemTypes.dashboard) {
        url = `/dashboard/${props.menuItem.form}/`;
    }

    return (
        <Link to={url} style={{ textDecoration: 'none' }} draggable={props.noLinkDrag ? false : undefined}>
            <Card
                sx={{
                    position: 'relative',
                    minWidth: compact ? 120 : 150,
                    width: compact ? 180 : undefined,
                    height: compact ? 100 : 150,
                    margin: compact ? 0 : 2,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    boxShadow: '3px 3px 5px 3px rgba(0,0,0,0.2)',
                    borderTop: '4px solid',
                    borderColor: accent ?? 'primary.main',
                    // Opaque white with the accent tint painted on top (a translucent background would let
                    // the page's watermark show through the tile).
                    backgroundColor: 'background.paper',
                    backgroundImage: (theme) => {
                        const tint = alpha(accent ?? theme.palette.primary.main, 0.05);
                        return `linear-gradient(${tint}, ${tint})`;
                    },
                    '&:hover': {
                        backgroundImage: (theme) => {
                            const tint = alpha(accent ?? theme.palette.primary.main, 0.12);
                            return `linear-gradient(${tint}, ${tint})`;
                        },
                    },
                }}
            >
                {props.onTogglePin && (
                    <IconButton
                        size="small"
                        aria-label={props.isPinned ? 'Unpin from home' : 'Pin to home'}
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            props.onTogglePin?.(props.menuItem.id);
                        }}
                        sx={{ position: 'absolute', top: 2, right: 2, padding: '2px' }}
                    >
                        {props.isPinned ? (
                            <PushPin sx={{ fontSize: '1rem' }} color="primary" />
                        ) : (
                            <PushPinOutlined sx={{ fontSize: '1rem' }} />
                        )}
                    </IconButton>
                )}
                <CardContent sx={compact ? { padding: 1, '&:last-child': { paddingBottom: 1 } } : undefined}>
                    <Typography variant={compact ? 'body2' : 'h6'} sx={{ color: accent ?? 'primary.main' }}>
                        {props.menuItem.title}
                    </Typography>
                    <Icon
                        fontSize={compact ? 'medium' : 'large'}
                        sx={{ color: accent ?? 'primary.main', margin: compact ? 0.5 : 1 }}
                    >
                        {props.menuItem.icon}
                    </Icon>
                    {!compact && <Typography>{props.menuItem.description ?? ''}</Typography>}
                </CardContent>
                {!!props.childCount && (
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center' }}
                    >
                        {props.childCount} {props.childCount === 1 ? 'item' : 'items'} inside
                    </Typography>
                )}
                {menuItemTypeLabels[props.menuItem.module_type] && (
                    <Typography
                        variant="caption"
                        sx={{
                            position: 'absolute',
                            bottom: 4,
                            right: 8,
                            fontSize: '0.65rem',
                            color: accent ?? 'primary.main',
                        }}
                    >
                        {menuItemTypeLabels[props.menuItem.module_type]}
                    </Typography>
                )}
            </Card>
        </Link>
    );
}

interface PersonalStats {
    thisMonth: number;
    allTime: number;
}

interface FormReportStats {
    form_uid: string;
    form_name: string;
    total: number;
    thisMonth: number;
}

interface CollapsibleSectionProps {
    title: string;
    /** Persists the expanded/collapsed state in localStorage under this key, per section - a
     * per-device viewing preference, not synced data. */
    storageKey: string;
    headerAction?: React.ReactNode;
    children: React.ReactNode;
}

const collapsedStateKey = (storageKey: string) => `bahis.menuSectionExpanded.${storageKey}`;

// Default expanded - collapsing is a per-viewing convenience (a long module list taking up
// space), not something that should hide content by default.
const getStoredExpanded = (storageKey: string): boolean => {
    try {
        const raw = localStorage.getItem(collapsedStateKey(storageKey));
        return raw === null ? true : raw === 'true';
    } catch {
        return true;
    }
};

const CollapsibleSection = ({ title, storageKey, headerAction, children }: CollapsibleSectionProps) => {
    const [expanded, setExpanded] = useState(() => getStoredExpanded(storageKey));

    const toggleExpanded = () => {
        setExpanded((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(collapsedStateKey(storageKey), String(next));
            } catch {
                // per-viewer convenience only - fine if it doesn't persist.
            }
            return next;
        });
    };

    return (
        <Box sx={{ marginBottom: 2 }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    backgroundColor: 'primary.light',
                    color: 'primary.main',
                    borderRadius: 1,
                    paddingX: 1.5,
                    paddingY: 0.5,
                    cursor: 'pointer',
                }}
                onClick={toggleExpanded}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', width: 'fit-content' }}>
                    <Typography variant="subtitle1" color="inherit">
                        {title}
                    </Typography>
                    <IconButton size="small" sx={{ color: 'inherit' }}>
                        {expanded ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                </Box>
                {headerAction}
            </Box>
            <Collapse in={expanded}>{children}</Collapse>
        </Box>
    );
};

export const Menu = () => {
    const [menuModules, setmenuModules] = useState<MenuItem[]>([]);
    const [pinnedIds, setPinnedIds] = useState<number[]>(() => getPinnedModuleIds());
    const [favoriteItems, setFavoriteItems] = useState<MenuItem[]>([]);
    const [draggedFavoriteId, setDraggedFavoriteId] = useState<number | null>(null);
    const [dropPosition, setDropPosition] = useState<{ id: number; side: 'before' | 'after' } | null>(null);
    const [childCounts, setChildCounts] = useState<Record<number, number>>({});
    const [stats, setStats] = useState<PersonalStats | null>(null);
    const [formStats, setFormStats] = useState<FormReportStats[]>([]);
    const [formStatsDialogOpen, setFormStatsDialogOpen] = useState(false);

    const { menu_id } = useParams();

    const isHome = !menu_id || menu_id === '0';

    const readModulesWithParent = (parent_module) => {
        // log.info(`reading modules with parent_module: ${parent_module}`);
        let query = 'SELECT DISTINCT * FROM module WHERE parent_module';
        if (parent_module > 0) {
            query += ` = ${parent_module}`;
        } else {
            query += ' IS NULL';
        }
        ipc.invoke('get-local-db', query)
            .then((response) => {
                log.debug(`modules: ${JSON.stringify(response)}`);
                setmenuModules(response);
            })
            .catch((error) => {
                log.error(`Error reading modules: ${error}`);
            });
    };

    useEffect(() => {
        readModulesWithParent(menu_id);
    }, [menu_id]);

    useEffect(() => {
        if (!isHome) return;

        if (pinnedIds.length === 0) {
            setFavoriteItems([]);
            return;
        }

        ipc.invoke(
            'get-local-db',
            `SELECT *
                 FROM module
                 WHERE id IN (${pinnedIds.join(',')})`,
        )
            .then((pinnedModules: MenuItem[]) => {
                // `WHERE id IN (...)` doesn't preserve the given order - SQLite returns rows in its
                // own (id) order - so re-sort to match pinnedIds, which is itself pin order (oldest
                // pin first), so the first module pinned shows first.
                const moduleById = new Map(pinnedModules.map((menuItem) => [menuItem.id, menuItem]));
                setFavoriteItems(
                    pinnedIds
                        .map((id) => moduleById.get(id))
                        .filter((menuItem): menuItem is MenuItem => menuItem !== undefined),
                );
            })
            .catch((error) => {
                log.error(`Error reading Favorites modules: ${error}`);
            });
    }, [isHome, pinnedIds]);

    // How many modules/forms/etc. sit directly inside each folder (module_type === module) tile
    // currently on screen - covers both the "All Modules" grid and any pinned folders in Favorites.
    useEffect(() => {
        const folderIds = [...menuModules, ...favoriteItems]
            .filter((menuItem) => menuItem.module_type === MenuItemTypes.module)
            .map((menuItem) => menuItem.id);
        const uniqueFolderIds = [...new Set(folderIds)];
        if (uniqueFolderIds.length === 0) {
            setChildCounts({});
            return;
        }
        ipc.invoke(
            'get-local-db',
            `SELECT parent_module, COUNT(*) as count
                 FROM module
                 WHERE parent_module IN (${uniqueFolderIds.join(',')})
                 GROUP BY parent_module`,
        )
            .then((rows: { parent_module: number; count: number }[]) => {
                setChildCounts(Object.fromEntries(rows.map((row) => [row.parent_module, row.count])));
            })
            .catch((error) => {
                log.error(`Error reading child module counts: ${error}`);
            });
    }, [menuModules, favoriteItems]);

    // Personal stats: reports completed this calendar month vs. all-time, from this device's own
    // formcloudsubmission table - there's no visibility into other agents' data from this client.
    // "This month" is judged by each submission's own embedded <end> tag (when data entry on the
    // report finished - the closest thing to an actual submission time this app has; KoboToolbox's
    // own server-recorded _submission_time isn't in what sync.ts fetches, which pulls the OpenRosa
    // XML format rather than the JSON REST API - checked a real submission's raw XML, no such field
    // anywhere in it), not the created_at column (when this device happened to sync/insert it) -
    // created_at is meaningless for this on a fresh install or after a database reset, since
    // everything gets (re-)inserted at once regardless of when it was originally submitted.
    // instr()/substr() pull "YYYY-MM" straight out of the stored XML in SQL - fast (a few ms even
    // over thousands of rows) since it runs in-process, without pulling any of that XML across the
    // IPC boundary just to compute a count.
    useEffect(() => {
        if (!isHome) return;

        const query = `
            SELECT
                COUNT(*) as allTime,
                COALESCE(SUM(
                    CASE WHEN substr(xml, instr(xml, '<end>') + 5, 7) = strftime('%Y-%m', 'now')
                    THEN 1 ELSE 0 END
                ), 0) as thisMonth
            FROM formcloudsubmission
        `;
        ipc.invoke('get-local-db', query)
            .then((response: PersonalStats[]) => {
                if (response[0]) setStats(response[0]);
            })
            .catch((error) => {
                log.error(`Error reading personal stats: ${error}`);
            });
    }, [isHome]);

    const handleTogglePin = (id: number) => {
        setPinnedIds(togglePinnedModuleId(id));
    };

    const handleClearAllPinned = () => {
        setPinnedIds(clearPinnedModuleIds());
    };

    const endFavoriteDrag = () => {
        setDraggedFavoriteId(null);
        setDropPosition(null);
    };

    // Where a dragged Favorite would land: next to whichever tile is nearest the pointer, on the side of it the
    // pointer is on. Going by the nearest tile (rather than the tile under the pointer) means dropping in the gap
    // between tiles, in the empty space after the last one, or before the first one all work.
    const findDropPosition = (event: React.DragEvent<HTMLElement>): { id: number; side: 'before' | 'after' } | null => {
        let nearest: { id: number; side: 'before' | 'after'; distance: number } | null = null;
        for (const tile of Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[data-favorite-id]'))) {
            const rect = tile.getBoundingClientRect();
            const dx = Math.max(rect.left - event.clientX, 0, event.clientX - rect.right);
            const dy = Math.max(rect.top - event.clientY, 0, event.clientY - rect.bottom);
            const distance = Math.hypot(dx, dy);
            if (nearest === null || distance < nearest.distance) {
                const isBefore =
                    event.clientY < rect.top || (event.clientY <= rect.bottom && event.clientX < rect.left + rect.width / 2);
                nearest = { id: Number(tile.dataset.favoriteId), side: isBefore ? 'before' : 'after', distance };
            }
        }
        return nearest && { id: nearest.id, side: nearest.side };
    };

    const handleFavoriteDragOver = (event: React.DragEvent<HTMLElement>) => {
        if (draggedFavoriteId === null) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        const position = findDropPosition(event);
        // dropping next to itself changes nothing, so don't show a marker for it
        const next = position && position.id !== draggedFavoriteId ? position : null;
        setDropPosition((current) => (current?.id === next?.id && current?.side === next?.side ? current : next));
    };

    const handleFavoriteDrop = (event: React.DragEvent<HTMLElement>) => {
        event.preventDefault();
        const position = findDropPosition(event);
        if (draggedFavoriteId !== null && position !== null && position.id !== draggedFavoriteId) {
            const nextIds = movePinnedModuleId(draggedFavoriteId, position.id, position.side);
            setPinnedIds(nextIds);
            // Reorder what's on screen right away rather than waiting for the Favorites query to re-run.
            setFavoriteItems((items) => {
                const byId = new Map(items.map((item) => [item.id, item]));
                return nextIds.map((id) => byId.get(id)).filter((item): item is MenuItem => item !== undefined);
            });
        }
        endFavoriteDrag();
    };

    // Per-form breakdown for the stats tile - same "this month" logic (by the submission's own
    // embedded <end> tag) as the overall stats query above, just grouped per form. LEFT JOIN so a
    // form with zero submissions still shows up with 0s rather than being silently absent.
    const handleOpenFormStats = () => {
        const query = `
            SELECT
                form.uid as form_uid,
                form.name as form_name,
                COUNT(formcloudsubmission.uuid) as total,
                COALESCE(SUM(
                    CASE WHEN substr(formcloudsubmission.xml, instr(formcloudsubmission.xml, '<end>') + 5, 7) = strftime('%Y-%m', 'now')
                    THEN 1 ELSE 0 END
                ), 0) as thisMonth
            FROM form
            LEFT JOIN formcloudsubmission ON formcloudsubmission.form_uid = form.uid
            GROUP BY form.uid, form.name
            ORDER BY form.name
        `;
        ipc.invoke('get-local-db', query)
            .then((response: FormReportStats[]) => {
                setFormStats(response);
                setFormStatsDialogOpen(true);
            })
            .catch((error) => {
                log.error(`Error reading per-form report stats: ${error}`);
            });
    };

    return (
        <>
            <VetBackground />

            {isHome && (
                <Box sx={{ marginTop: 2 }}>
                    {favoriteItems.length > 0 && (
                        <CollapsibleSection
                            title="Favorites"
                            storageKey="favorites"
                            headerAction={
                                pinnedIds.length > 0 && (
                                    <Button size="small" color="inherit" onClick={handleClearAllPinned}>
                                        Clear all
                                    </Button>
                                )
                            }
                        >
                            <Box
                                sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 2 }}
                                onDragOver={handleFavoriteDragOver}
                                onDrop={handleFavoriteDrop}
                                onDragLeave={(event) => {
                                    // only when the pointer leaves the whole Favorites area, not when it moves between tiles
                                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                                        setDropPosition(null);
                                    }
                                }}
                            >
                                {favoriteItems.map((menuItem) => {
                                    const markerSide = dropPosition?.id === menuItem.id ? dropPosition.side : null;
                                    return (
                                        <Box
                                            key={'favorite-' + menuItem.id}
                                            data-favorite-id={menuItem.id}
                                            draggable
                                            title="Drag to reorder"
                                            onDragStart={(event) => {
                                                event.dataTransfer.effectAllowed = 'move';
                                                event.dataTransfer.setData('text/plain', String(menuItem.id));
                                                setDraggedFavoriteId(menuItem.id);
                                            }}
                                            onDragEnd={endFavoriteDrag}
                                            sx={{
                                                position: 'relative',
                                                display: 'flex',
                                                cursor: 'grab',
                                                opacity: draggedFavoriteId === menuItem.id ? 0.4 : 1,
                                                // insertion marker, drawn in the gap on the side the tile would land
                                                '&::after': {
                                                    content: '""',
                                                    display: markerSide ? 'block' : 'none',
                                                    position: 'absolute',
                                                    top: 0,
                                                    bottom: 0,
                                                    width: '4px',
                                                    borderRadius: '2px',
                                                    backgroundColor: 'primary.main',
                                                    left: markerSide === 'before' ? '-14px' : 'auto',
                                                    right: markerSide === 'after' ? '-14px' : 'auto',
                                                },
                                            }}
                                        >
                                            <MenuButton
                                                menuItem={menuItem}
                                                isPinned={pinnedIds.includes(menuItem.id)}
                                                onTogglePin={handleTogglePin}
                                                childCount={
                                                    menuItem.module_type === MenuItemTypes.module
                                                        ? childCounts[menuItem.id]
                                                        : undefined
                                                }
                                                compact
                                                noLinkDrag
                                            />
                                        </Box>
                                    );
                                })}
                            </Box>
                        </CollapsibleSection>
                    )}
                </Box>
            )}

            <CollapsibleSection title="All Modules" storageKey="all-modules">
                <Grid container>
                    {menuModules.length > 0 ? (
                        menuModules.map((menuItem) => (
                            <Grid
                                key={'menu-' + menuItem.id}
                                style={{ order: menuItem.sort_order }}
                                size={{ lg: 3, md: 4, sm: 6, xs: 12 }}
                            >
                                <MenuButton
                                    menuItem={menuItem}
                                    isPinned={pinnedIds.includes(menuItem.id)}
                                    onTogglePin={handleTogglePin}
                                    childCount={
                                        menuItem.module_type === MenuItemTypes.module ? childCounts[menuItem.id] : undefined
                                    }
                                />
                            </Grid>
                        ))
                    ) : (
                        <Alert
                            severity="error"
                            action={
                                <Button color="inherit" size="small" onClick={() => window.location.reload()}>
                                    REFRESH
                                </Button>
                            }
                        >
                            No modules found - try refreshing the app.
                        </Alert>
                    )}
                </Grid>
            </CollapsibleSection>

            {isHome && stats && (
                <Card
                    onClick={handleOpenFormStats}
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '2px 8px',
                        cursor: 'pointer',
                        position: 'fixed',
                        // Sit just above the fixed Footer, whose height is reserved by Layout's own
                        // spacer <Toolbar /> - use the same theme mixin so this stays in sync with it.
                        bottom: (theme) => `calc(${theme.mixins.toolbar.minHeight}px)`,
                        right: 16,
                        zIndex: (theme) => theme.zIndex.appBar,
                    }}
                >
                    <Typography variant="caption" color="text.secondary">
                        {stats.allTime.toLocaleString()} reports all-time &middot; {stats.thisMonth.toLocaleString()} this
                        month
                    </Typography>
                    <Tooltip
                        title={
                            'Counted by when the data was entered, not when the patient/farm visit actually happened' +
                            ' - e.g. a visit from a month ago that only gets entered today counts as entered this' +
                            ' month, not last month.'
                        }
                    >
                        <InfoOutlined fontSize="inherit" sx={{ marginLeft: 0.5, color: 'text.secondary' }} />
                    </Tooltip>
                </Card>
            )}

            <Dialog
                open={formStatsDialogOpen}
                onClose={() => setFormStatsDialogOpen(false)}
                aria-labelledby="form-stats-dialog-title"
            >
                <DialogTitle id="form-stats-dialog-title" sx={{ position: 'relative' }}>
                    Reports per form
                    <IconButton onClick={() => setFormStatsDialogOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <TableContainer component={Paper}>
                        <Table sx={{ minWidth: 320 }} size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Form</TableCell>
                                    <TableCell align="right">This month</TableCell>
                                    <TableCell align="right">Total</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {formStats.map(({ form_uid, form_name, thisMonth, total }) => (
                                    <TableRow key={form_uid}>
                                        <TableCell>{form_name}</TableCell>
                                        <TableCell align="right">{thisMonth.toLocaleString()}</TableCell>
                                        <TableCell align="right">{total.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
            </Dialog>
        </>
    );
};
