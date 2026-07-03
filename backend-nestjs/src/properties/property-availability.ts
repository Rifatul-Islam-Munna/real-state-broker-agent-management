import { PropertyStatus } from './entities/property.entity';

export const LIVE_PROPERTY_STATUSES = [PropertyStatus.Open, PropertyStatus.Active, PropertyStatus.UnderOffer] as const;

export function isLivePropertyStatus(status: unknown) {
  return LIVE_PROPERTY_STATUSES.includes(status as (typeof LIVE_PROPERTY_STATUSES)[number]);
}

export function isPropertyLeadEligible<T extends { status?: unknown }>(property: T | null | undefined): property is T {
  return !!property && isLivePropertyStatus(property.status);
}
