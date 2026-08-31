import { createHash } from 'node:crypto';
import { ChatbotAudience } from './tenant-chatbot.types';

export type PropertyKnowledgeInput = {
  id: number | string;
  title: string;
  status?: string;
  payload?: Record<string, unknown> | null;
};

export type PropertyKnowledgeChunk = {
  propertyId: number;
  scope: 'PROPERTY';
  audience: ChatbotAudience;
  sourceType: 'PROPERTY_FIELD';
  sourceKey: string;
  sourceHash: string;
  title: string;
  content: string;
  priority: number;
};

type FieldDefinition = {
  key: string;
  label: string;
  priority?: number;
};

const LEAD_FIELDS: FieldDefinition[] = [
  { key: 'description', label: 'Description', priority: 80 },
  { key: 'extraDescription', label: 'Additional details', priority: 70 },
  { key: 'price', label: 'Price', priority: 80 },
  { key: 'monthlyRent', label: 'Monthly rent', priority: 80 },
  { key: 'category', label: 'Category' },
  { key: 'listingType', label: 'Listing type' },
  { key: 'propertyType', label: 'Property type' },
  { key: 'location', label: 'Location', priority: 70 },
  { key: 'exactLocation', label: 'Address', priority: 70 },
  { key: 'address', label: 'Address', priority: 70 },
  { key: 'bedroom', label: 'Bedrooms' },
  { key: 'bedRoom', label: 'Bedrooms' },
  { key: 'bedrooms', label: 'Bedrooms' },
  { key: 'bathroom', label: 'Bathrooms' },
  { key: 'bathRoom', label: 'Bathrooms' },
  { key: 'bathrooms', label: 'Bathrooms' },
  { key: 'width', label: 'Size' },
  { key: 'squareFeet', label: 'Square feet' },
  {
    key: 'minimumCreditScore',
    label: 'Minimum credit score',
    priority: 90,
  },
  {
    key: 'minimumMonthlyIncome',
    label: 'Minimum monthly income',
    priority: 90,
  },
  { key: 'securityDeposit', label: 'Security deposit', priority: 80 },
  { key: 'applicationFee', label: 'Application fee', priority: 80 },
  { key: 'availableFrom', label: 'Available from', priority: 80 },
  {
    key: 'minimumLeaseMonths',
    label: 'Minimum lease months',
    priority: 80,
  },
  {
    key: 'applicationInstructions',
    label: 'Application instructions',
    priority: 80,
  },
  { key: 'amenities', label: 'Amenities', priority: 70 },
  { key: 'keyAmenities', label: 'Key amenities', priority: 70 },
  { key: 'neighborhoodInsights', label: 'Neighborhood insights', priority: 60 },
  { key: 'preQuestions', label: 'Application pre-questions', priority: 60 },
  { key: 'features', label: 'Features', priority: 70 },
  { key: 'parking', label: 'Parking', priority: 70 },
  { key: 'petPolicy', label: 'Pet policy', priority: 80 },
  { key: 'utilities', label: 'Utilities' },
  { key: 'leaseTerms', label: 'Lease terms' },
  { key: 'furnished', label: 'Furnished' },
];

const REALTOR_FIELDS: FieldDefinition[] = [
  {
    key: 'realtorDescription',
    label: 'Realtor property description',
    priority: 90,
  },
  {
    key: 'realtorShowingInstructions',
    label: 'Realtor showing instructions',
    priority: 100,
  },
  { key: 'ownerName', label: 'Owner name', priority: 90 },
  { key: 'ownerEmail', label: 'Owner email', priority: 90 },
  { key: 'ownerPhone', label: 'Owner phone', priority: 90 },
  { key: 'ownerExtraInfo', label: 'Owner notes', priority: 90 },
  { key: 'internalRemarks', label: 'Internal remarks', priority: 90 },
  { key: 'entryInstructions', label: 'Entry instructions', priority: 100 },
  { key: 'lockboxCode', label: 'Lockbox code', priority: 100 },
  { key: 'commissionInfo', label: 'Commission information', priority: 90 },
];

export function mapPropertyKnowledge(
  property: PropertyKnowledgeInput,
): PropertyKnowledgeChunk[] {
  const propertyId = Number(property.id);
  if (!Number.isInteger(propertyId) || propertyId <= 0) {
    throw new Error('Property id must be a positive integer.');
  }
  const payload = isRecord(property.payload) ? property.payload : {};
  const title = text(property.title) || `Property ${propertyId}`;
  const chunks: PropertyKnowledgeChunk[] = [];

  addChunk(
    chunks,
    propertyId,
    title,
    'LEAD',
    {
      key: 'title',
      label: 'Property',
      priority: 100,
    },
    title,
  );
  addChunk(
    chunks,
    propertyId,
    title,
    'REALTOR',
    {
      key: 'title',
      label: 'Property',
      priority: 100,
    },
    title,
  );

  const status = text(property.status);
  if (status) {
    const statusField: FieldDefinition = {
      key: 'status',
      label: 'Listing status',
      priority: 90,
    };
    addChunk(chunks, propertyId, title, 'LEAD', statusField, status);
    addChunk(chunks, propertyId, title, 'REALTOR', statusField, status);
  }
  for (const field of LEAD_FIELDS) {
    const value =
      displayValue(payload[field.key]) ||
      (field.key === 'minimumCreditScore'
        ? minimumCreditScoreFromDescription(payload.description)
        : '');
    if (!value) continue;
    addChunk(chunks, propertyId, title, 'LEAD', field, value);
    addChunk(chunks, propertyId, title, 'REALTOR', field, value);
  }
  for (const [index, detail] of descriptionDetails(payload.description).entries()) {
    const field: FieldDefinition = {
      key: `descriptionDetail:${index}`,
      label: detail.label,
      priority: 85,
    };
    addChunk(chunks, propertyId, title, 'LEAD', field, detail.value);
    addChunk(chunks, propertyId, title, 'REALTOR', field, detail.value);
  }
  for (const field of REALTOR_FIELDS) {
    const value = displayValue(payload[field.key]);
    if (!value) continue;
    addChunk(chunks, propertyId, title, 'REALTOR', field, value);
  }
  return chunks;
}

function descriptionDetails(value: unknown) {
  const description = text(value);
  if (!description) return [];
  const lines = description
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const colon = line.indexOf(':');
      if (colon > 0 && colon <= 80) return [line];
      return line
        .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
        .map((sentence) => sentence.trim())
        .filter(Boolean);
    });
  const details: Array<{ label: string; value: string }> = [];
  for (const line of lines) {
    const colon = line.indexOf(':');
    const rawLabel = colon > 0 && colon <= 80 ? line.slice(0, colon).trim() : '';
    const rawValue = rawLabel ? line.slice(colon + 1).trim() : line;
    if (!rawValue) continue;
    details.push({
      label: rawLabel
        ? descriptionLabel(rawLabel)
        : inferredDescriptionLabel(rawValue),
      value: rawValue,
    });
  }
  return details;
}

function descriptionLabel(value: string) {
  const normalized = value.toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
  if (value.trim().toLowerCase() === 'pets') return 'Pet policy';
  return normalized;
}

function inferredDescriptionLabel(value: string) {
  const normalized = value.toLowerCase();
  if (/\bpa(?:r)?king\b/.test(normalized)) return 'Parking';
  if (/\bpets?\b/.test(normalized)) return 'Pet policy';
  if (/\bsmok/.test(normalized)) return 'Smoking';
  if (/\bcredit\b/.test(normalized)) return 'Credit requirement';
  if (/\bincome\b/.test(normalized)) return 'Income requirement';
  if (/\butilities?\b/.test(normalized)) return 'Utilities';
  if (/\bdeposit\b/.test(normalized)) return 'Deposit';
  if (/\bapplication\b/.test(normalized)) return 'Application';
  if (/\blease\b/.test(normalized)) return 'Lease terms';
  if (/\bhoa\b|\bassociation\b/.test(normalized)) return 'Association';
  if (/\binsurance\b/.test(normalized)) return 'Tenant insurance';
  if (/\bcontact\b|@|\bphone\b/.test(normalized)) return 'Listing contact';
  return 'Description detail';
}

function addChunk(
  chunks: PropertyKnowledgeChunk[],
  propertyId: number,
  propertyTitle: string,
  audience: ChatbotAudience,
  field: FieldDefinition,
  value: string,
) {
  const content = `${field.label}: ${value}`;
  const sourceKey = `property:${propertyId}:${audience}:${field.key}`;
  chunks.push({
    propertyId,
    scope: 'PROPERTY',
    audience,
    sourceType: 'PROPERTY_FIELD',
    sourceKey,
    sourceHash: createHash('sha256')
      .update(`${sourceKey}\n${content}`)
      .digest('hex'),
    title: `${propertyTitle} — ${field.label}`,
    content,
    priority: field.priority ?? 60,
  });
}

function minimumCreditScoreFromDescription(value: unknown) {
  const description = text(value);
  const match = description.match(/\bcredit\s*score\b[^\d]{0,12}(\d{3})\b/i);
  const score = Number(match?.[1]);
  return Number.isInteger(score) && score >= 300 && score <= 850
    ? String(score)
    : '';
}

function displayValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return `${value}`;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    return value
      .map((item) => displayValue(item))
      .filter(Boolean)
      .join(', ');
  }
  if (isRecord(value)) {
    return Object.entries(value)
      .map(([key, item]) => {
        const formatted = displayValue(item);
        return formatted ? `${humanize(key)}: ${formatted}` : '';
      })
      .filter(Boolean)
      .join('; ');
  }
  return '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function humanize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}
