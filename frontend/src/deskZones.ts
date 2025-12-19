import type { DeskListItemDto } from './types';

export type DeskZoneId = 'A' | 'B' | 'C';

type ZoneRule = {
  id: DeskZoneId;
  label: string;
  match: (deskNumber: number) => boolean;
};

const ZONE_RULES: ZoneRule[] = [
  { id: 'A', label: 'Zone A (Window)', match: (number) => number <= 8 },
  { id: 'B', label: 'Zone B (Center)', match: (number) => number >= 9 && number <= 16 },
  { id: 'C', label: 'Zone C (Quiet)', match: (number) => number >= 17 },
];

export const getDeskZone = (deskNumber: number): DeskZoneId => {
  return ZONE_RULES.find((rule) => rule.match(deskNumber))?.id ?? 'C';
};

export const getDeskZoneLabel = (zoneId: DeskZoneId) => {
  return ZONE_RULES.find((rule) => rule.id === zoneId)?.label ?? 'Zone C';
};

export const isWindowDesk = (deskNumber: number) => getDeskZone(deskNumber) === 'A';

export const groupDesksByZone = (desks: DeskListItemDto[]) => {
  const byZone = new Map<DeskZoneId, DeskListItemDto[]>();
  ZONE_RULES.forEach((rule) => byZone.set(rule.id, []));

  desks.forEach((desk) => {
    const zone = getDeskZone(desk.number);
    byZone.get(zone)?.push(desk);
  });

  return ZONE_RULES
    .map((rule) => ({
      id: rule.id,
      label: rule.label,
      desks: byZone.get(rule.id) ?? [],
    }))
    .filter((zone) => zone.desks.length > 0);
};
