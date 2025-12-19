import { useEffect, useMemo, useRef, useState } from 'react';
import { Group, Layer, Rect, Stage, Text, Circle } from 'react-konva';
import type Konva from 'konva';
import type { DeskListItemDto } from '../types';
import { DeskStatus } from '../types';
import { groupDesksByZone } from '../deskZones';

type DeskPlanProps = {
  desks: DeskListItemDto[];
  selectedDeskId: number | null;
  onSelectDesk: (deskId: number) => void;
  onActivateDesk?: (deskId: number) => void;
  highContrast?: boolean;
};

type StatusName = 'Open' | 'Reserved' | 'Maintenance';

type GridLayout = {
  colCount: number;
  cellWidth: number;
  cellHeight: number;
  rows: number;
  height: number;
};

type ZoneLayout = {
  id: string;
  label: string;
  desks: DeskListItemDto[];
  x: number;
  y: number;
  width: number;
  grid: GridLayout;
  height: number;
};

type HoveredMeta = {
  desk: DeskListItemDto;
  statusName: StatusName;
  x: number;
  y: number;
  width: number;
  height: number;
};

const resolveStatusName = (status: DeskStatus | string): StatusName => {
  if (status === DeskStatus.Reserved || status === 'Reserved') return 'Reserved';
  if (status === DeskStatus.Maintenance || status === 'Maintenance') return 'Maintenance';
  return 'Open';
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const buildGridLayout = (
  zoneWidth: number,
  deskCount: number,
  gap: number,
  minCell: number,
  maxCell: number
): GridLayout => {
  if (deskCount <= 0) {
    const size = Math.max(90, Math.min(120, minCell * 0.78));
    return { colCount: 1, cellWidth: minCell, cellHeight: size, rows: 1, height: size };
  }

  const cols = Math.max(1, Math.floor((zoneWidth + gap) / (minCell + gap)));
  const colCount = Math.min(cols, deskCount);
  const cellWidth = Math.min(maxCell, (zoneWidth - gap * (colCount - 1)) / colCount);
  const cellHeight = Math.max(90, Math.min(120, cellWidth * 0.78));
  const rows = Math.max(1, Math.ceil(deskCount / colCount));
  const height = rows * cellHeight + gap * (rows - 1);

  return { colCount, cellWidth, cellHeight, rows, height };
};

export function DeskPlan({ desks, selectedDeskId, onSelectDesk, onActivateDesk, highContrast }: DeskPlanProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const [stageWidth, setStageWidth] = useState(900);
  const [hovered, setHovered] = useState<HoveredMeta | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      const next = Math.max(320, Math.floor(element.getBoundingClientRect().width));
      setStageWidth(next);
    };

    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => updateSize());
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (hovered && !desks.some((desk) => desk.deskId === hovered.desk.deskId)) {
      setHovered(null);
    }
  }, [desks, hovered]);

  const sortedDesks = useMemo(
    () => [...desks].sort((a, b) => a.number - b.number),
    [desks]
  );

  const statusCounts = useMemo(() => {
    return sortedDesks.reduce(
      (acc, desk) => {
        const status = resolveStatusName(desk.status);
        if (status === 'Open') acc.open += 1;
        if (status === 'Reserved') acc.reserved += 1;
        if (status === 'Maintenance') acc.maintenance += 1;
        return acc;
      },
      { open: 0, reserved: 0, maintenance: 0 }
    );
  }, [sortedDesks]);

  const layout = useMemo(() => {
    const padding = 24;
    const gap = 18;
    const zoneGap = stageWidth < 720 ? 28 : 40;
    const zoneHeaderHeight = 22;
    const minCell = 110;
    const maxCell = 150;
    const zoneSpecs = groupDesksByZone(sortedDesks);
    const zones = zoneSpecs.length > 0 ? zoneSpecs : [{ id: 'A', label: 'Zone A', desks: [] }];
    const isStacked = stageWidth < 720 && zones.length > 1;
    const availableWidth = stageWidth - padding * 2;
    const zoneWidth = isStacked
      ? availableWidth
      : (availableWidth - zoneGap * (zones.length - 1)) / Math.max(1, zones.length);

    let offsetY = padding;
    const zoneLayouts: ZoneLayout[] = zones.map((zone, index) => {
      const grid = buildGridLayout(zoneWidth, zone.desks.length, gap, minCell, maxCell);
      const x = isStacked ? padding : padding + index * (zoneWidth + zoneGap);
      const y = isStacked ? offsetY : padding;
      const height = zoneHeaderHeight + grid.height;

      if (isStacked) {
        offsetY += height + zoneGap;
      }

      return {
        ...zone,
        x,
        y,
        width: zoneWidth,
        grid,
        height,
      };
    });

    const maxGridHeight = Math.max(0, ...zoneLayouts.map((zone) => zone.grid.height));
    const contentHeight = isStacked
      ? offsetY - zoneGap + padding
      : padding * 2 + zoneHeaderHeight + maxGridHeight + 16;
    const corridorWidth = !isStacked && zoneLayouts.length > 1 ? Math.max(18, Math.min(36, zoneGap - 8)) : 0;

    return {
      padding,
      gap,
      zoneGap,
      zoneHeaderHeight,
      height: Math.max(260, Math.floor(contentHeight)),
      zones: zoneLayouts,
      isStacked,
      corridorWidth,
      maxGridHeight,
    };
  }, [sortedDesks, stageWidth]);

  const selectedDesk = useMemo(
    () => sortedDesks.find((desk) => desk.deskId === selectedDeskId) ?? null,
    [sortedDesks, selectedDeskId]
  );

  const palette = highContrast
    ? {
        Open: { fill: '#dcfce7', stroke: '#10b981', accent: '#047857' },
        Reserved: { fill: '#ffe4e6', stroke: '#f43f5e', accent: '#be123c' },
        Maintenance: { fill: '#e2e8f0', stroke: '#64748b', accent: '#475569' },
      }
    : {
        Open: { fill: '#ecfdf3', stroke: '#34d399', accent: '#059669' },
        Reserved: { fill: '#fff1f2', stroke: '#fb7185', accent: '#e11d48' },
        Maintenance: { fill: '#f1f5f9', stroke: '#94a3b8', accent: '#64748b' },
      };

  const hoveredTitle = hovered
    ? `Desk #${hovered.desk.number} - ${hovered.statusName}`
    : 'Hover a desk to preview details.';
  const reservedPerson = hovered
    ? `${hovered.desk.reservedByFirstName ?? ''} ${hovered.desk.reservedByLastName ?? ''}`.trim()
    : '';
  const hoveredSubtitle = hovered
    ? hovered.statusName === 'Reserved' && reservedPerson
      ? `Reserved by ${reservedPerson}`
      : hovered.statusName === 'Maintenance' && hovered.desk.maintenanceMessage
        ? hovered.desk.maintenanceMessage
        : hovered.statusName === 'Open'
          ? 'Click to reserve this desk.'
          : 'This desk is not available.'
    : 'Click any green desk to reserve.';
  const selectionLabel = selectedDesk ? `Selected desk #${selectedDesk.number}` : 'No desk selected.';

  const setCursor = (cursor: string) => {
    const container = stageRef.current?.container();
    if (container) {
      container.style.cursor = cursor;
    }
  };

  const zoomTo = (nextZoom: number, anchor?: { x: number; y: number }) => {
    const clamped = clamp(nextZoom, 0.8, 1.8);
    if (!anchor) {
      setZoom(clamped);
      return;
    }

    const oldScale = zoom;
    const mousePointTo = {
      x: (anchor.x - position.x) / oldScale,
      y: (anchor.y - position.y) / oldScale,
    };
    const newPos = {
      x: anchor.x - mousePointTo.x * clamped,
      y: anchor.y - mousePointTo.y * clamped,
    };
    setZoom(clamped);
    setPosition(newPos);
  };

  const resetView = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const scaleBy = 1.06;
    const direction = event.evt.deltaY > 0 ? -1 : 1;
    const next = zoom * (direction > 0 ? scaleBy : 1 / scaleBy);
    zoomTo(next, pointer);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (sortedDesks.length === 0) return;
    const index = selectedDeskId ? sortedDesks.findIndex((desk) => desk.deskId === selectedDeskId) : -1;
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'Home') {
        onSelectDesk(sortedDesks[0].deskId);
        return;
      }
      if (event.key === 'End') {
        onSelectDesk(sortedDesks[sortedDesks.length - 1].deskId);
        return;
      }
      const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = index === -1 ? 0 : clamp(index + step, 0, sortedDesks.length - 1);
      onSelectDesk(sortedDesks[nextIndex].deskId);
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && selectedDeskId && onActivateDesk) {
      event.preventDefault();
      onActivateDesk(selectedDeskId);
    }
  };

  const tooltipPeriod =
    hovered?.desk.myReservationStart && hovered?.desk.myReservationEnd
      ? `${hovered.desk.myReservationStart} - ${hovered.desk.myReservationEnd}`
      : hovered?.statusName === 'Reserved'
        ? 'Period unavailable'
        : null;

  const tooltipLines = hovered
    ? [
        `Desk #${hovered.desk.number}`,
        hovered.statusName,
        reservedPerson ? `By ${reservedPerson}` : null,
        tooltipPeriod,
      ].filter(Boolean) as string[]
    : [];

  const tooltipWidth = 190;
  const tooltipPadding = 10;
  const tooltipLineHeight = 16;
  const tooltipHeight = tooltipPadding * 2 + tooltipLines.length * tooltipLineHeight;
  const tooltipX = hovered
    ? clamp(hovered.x + hovered.width + 12, 8, stageWidth - tooltipWidth - 8)
    : 0;
  const tooltipY = hovered
    ? clamp(hovered.y, 8, layout.height - tooltipHeight - 8)
    : 0;

  return (
    <section className="rounded-3xl border border-white/60 bg-white/90 p-4 sm:p-6 shadow-lg">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
        <div className="space-y-1">
          <div className="text-[11px] sm:text-xs uppercase tracking-[0.3em] text-slate-500">2D plan</div>
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Office floor map</h2>
          <p className="text-sm text-slate-500">{hoveredTitle}</p>
          <p className="text-xs text-slate-400">{hoveredSubtitle}</p>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-700 px-2 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold" aria-live="polite">
            {selectionLabel}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-700 px-2 sm:px-3 py-1 text-[11px] sm:text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Open {statusCounts.open}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 text-rose-700 px-2 sm:px-3 py-1 text-[11px] sm:text-xs">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Reserved {statusCounts.reserved}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-200 text-slate-700 px-2 sm:px-3 py-1 text-[11px] sm:text-xs">
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            Maintenance {statusCounts.maintenance}
          </span>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm">
            <button
              type="button"
              className="h-7 w-7 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 focus-ring"
              onClick={() => zoomTo(zoom - 0.1)}
              aria-label="Zoom out"
            >
              -
            </button>
            <button
              type="button"
              className="h-7 w-7 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 focus-ring"
              onClick={resetView}
              aria-label="Reset zoom"
            >
              1x
            </button>
            <button
              type="button"
              className="h-7 w-7 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 focus-ring"
              onClick={() => zoomTo(zoom + 0.1)}
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 focus-ring"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label="Desk plan. Use arrow keys to move. Press Enter to reserve."
      >
        <Stage
          ref={stageRef}
          width={stageWidth}
          height={layout.height}
          draggable
          scaleX={zoom}
          scaleY={zoom}
          x={position.x}
          y={position.y}
          onDragEnd={(event) => setPosition({ x: event.target.x(), y: event.target.y() })}
          onWheel={handleWheel}
        >
          <Layer>
            <Rect
              x={layout.padding}
              y={6}
              width={stageWidth - layout.padding * 2}
              height={6}
              fill="rgba(148,163,184,0.35)"
              cornerRadius={4}
            />
            <Rect
              x={layout.padding}
              y={layout.height - 12}
              width={stageWidth - layout.padding * 2}
              height={6}
              fill="rgba(148,163,184,0.2)"
              cornerRadius={4}
            />

            {!layout.isStacked && layout.zones.length > 1 && (
              <>
                <Rect
                  x={layout.padding + layout.zones[0].width + layout.zoneGap / 2 - layout.corridorWidth / 2}
                  y={layout.padding + layout.zoneHeaderHeight}
                  width={layout.corridorWidth}
                  height={layout.maxGridHeight}
                  fill="#e2e8f0"
                  cornerRadius={14}
                  opacity={0.7}
                />
                <Text
                  x={layout.padding + layout.zones[0].width + layout.zoneGap / 2 - 28}
                  y={layout.padding + layout.zoneHeaderHeight - 16}
                  text="Corridor"
                  fontSize={10}
                  fontFamily="Montserrat"
                  fill="#94a3b8"
                />
              </>
            )}

            {layout.zones.map((zone) => {
              const backgroundHeight = layout.isStacked ? zone.grid.height : layout.maxGridHeight;
              return (
                <Group key={zone.id}>
                  <Text
                    x={zone.x}
                    y={zone.y}
                    text={zone.label}
                    fontSize={12}
                    fontFamily="Montserrat"
                    fill="#64748b"
                  />
                  <Rect
                    x={zone.x - 8}
                    y={zone.y + layout.zoneHeaderHeight - 8}
                    width={zone.width + 16}
                    height={backgroundHeight + 16}
                    fill="rgba(255,255,255,0.7)"
                    stroke="rgba(148,163,184,0.25)"
                    cornerRadius={20}
                  />
                </Group>
              );
            })}

            {layout.zones.map((zone) => {
              const baseY = zone.y + layout.zoneHeaderHeight;
              return zone.desks.map((desk, index) => {
                const col = index % zone.grid.colCount;
                const row = Math.floor(index / zone.grid.colCount);
                const x = zone.x + col * (zone.grid.cellWidth + layout.gap);
                const y = baseY + row * (zone.grid.cellHeight + layout.gap);
                const statusName = resolveStatusName(desk.status);
                const style = palette[statusName];
                const isSelected = selectedDeskId === desk.deskId;
                const isHovered = hovered?.desk.deskId === desk.deskId;
                const tableWidth = zone.grid.cellWidth * 0.6;
                const tableHeight = zone.grid.cellHeight * 0.22;
                const tableX = x + (zone.grid.cellWidth - tableWidth) / 2;
                const tableY = y + zone.grid.cellHeight * 0.38;
                const chairSize = zone.grid.cellHeight * 0.18;
                const selectionWidth = 70;
                const selectionHeight = 18;

                return (
                  <Group
                    key={desk.deskId}
                    onMouseEnter={() => {
                      setHovered({
                        desk,
                        statusName,
                        x,
                        y,
                        width: zone.grid.cellWidth,
                        height: zone.grid.cellHeight,
                      });
                      setCursor('pointer');
                    }}
                    onMouseLeave={() => {
                      setHovered(null);
                      setCursor('default');
                    }}
                    onClick={() => {
                      onSelectDesk(desk.deskId);
                    }}
                    onTap={() => {
                      onSelectDesk(desk.deskId);
                    }}
                  >
                    <Rect
                      x={x}
                      y={y}
                      width={zone.grid.cellWidth}
                      height={zone.grid.cellHeight}
                      fill={style.fill}
                      stroke={isSelected ? '#f59e0b' : style.stroke}
                      strokeWidth={isSelected ? 3 : 1}
                      cornerRadius={16}
                      dash={statusName === 'Maintenance' ? [6, 4] : undefined}
                      shadowColor={isSelected ? 'rgba(245,158,11,0.55)' : 'rgba(15,23,42,0.12)'}
                      shadowBlur={isHovered || isSelected ? 14 : 6}
                      shadowOffset={{ x: 0, y: 4 }}
                    />
                    {isHovered && (
                      <Rect
                        x={x}
                        y={y}
                        width={zone.grid.cellWidth}
                        height={zone.grid.cellHeight}
                        fill="rgba(255,255,255,0.25)"
                        cornerRadius={16}
                      />
                    )}
                    <Rect
                      x={tableX}
                      y={tableY}
                      width={tableWidth}
                      height={tableHeight}
                      fill="#ffffff"
                      stroke="rgba(255,255,255,0.9)"
                      cornerRadius={10}
                      shadowColor="rgba(15,23,42,0.08)"
                      shadowBlur={4}
                      shadowOffset={{ x: 0, y: 2 }}
                    />
                    <Rect
                      x={x + zone.grid.cellWidth * 0.16}
                      y={tableY + tableHeight + 8}
                      width={chairSize}
                      height={chairSize}
                      fill="#ffffff"
                      stroke="rgba(148,163,184,0.4)"
                      cornerRadius={6}
                    />
                    <Rect
                      x={x + zone.grid.cellWidth * 0.68}
                      y={tableY + tableHeight + 8}
                      width={chairSize}
                      height={chairSize}
                      fill="#ffffff"
                      stroke="rgba(148,163,184,0.4)"
                      cornerRadius={6}
                    />
                    <Text
                      x={x + 14}
                      y={y + 10}
                      text="Desk"
                      fontSize={10}
                      fontFamily="Montserrat"
                      fill="#64748b"
                      letterSpacing={2}
                    />
                    <Text
                      x={x + 14}
                      y={y + 24}
                      text={`${desk.number}`}
                      fontSize={20}
                      fontStyle="bold"
                      fontFamily="Montserrat"
                      fill={style.accent}
                    />
                    <Circle
                      x={x + zone.grid.cellWidth - 18}
                      y={y + 16}
                      radius={5}
                      fill={style.accent}
                    />
                    {isSelected && (
                      <>
                        <Rect
                          x={x + zone.grid.cellWidth - selectionWidth - 8}
                          y={y + zone.grid.cellHeight - selectionHeight - 8}
                          width={selectionWidth}
                          height={selectionHeight}
                          fill="#f59e0b"
                          cornerRadius={9}
                        />
                        <Text
                          x={x + zone.grid.cellWidth - selectionWidth - 8}
                          y={y + zone.grid.cellHeight - selectionHeight - 6}
                          width={selectionWidth}
                          align="center"
                          text="Selected"
                          fontSize={10}
                          fontFamily="Montserrat"
                          fill="#ffffff"
                        />
                      </>
                    )}
                  </Group>
                );
              });
            })}

            {hovered && tooltipLines.length > 0 && (
              <Group>
                <Rect
                  x={tooltipX}
                  y={tooltipY}
                  width={tooltipWidth}
                  height={tooltipHeight}
                  fill="rgba(15,23,42,0.9)"
                  cornerRadius={12}
                  shadowColor="rgba(15,23,42,0.2)"
                  shadowBlur={8}
                />
                {tooltipLines.map((line, index) => (
                  <Text
                    key={`${line}-${index}`}
                    x={tooltipX + tooltipPadding}
                    y={tooltipY + tooltipPadding + index * tooltipLineHeight}
                    width={tooltipWidth - tooltipPadding * 2}
                    text={line}
                    fontSize={12}
                    fontFamily="Montserrat"
                    fill="#f8fafc"
                  />
                ))}
              </Group>
            )}
          </Layer>
        </Stage>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Drag to pan, scroll to zoom, arrow keys to navigate, Enter to reserve.
      </p>
    </section>
  );
}
