import { DocumentType } from '../documents/entities/document.entity';
import { DocumentsService } from '../documents/documents.service';
import { Property } from './entities/property.entity';
import { propertyDocumentAccessLevel, publicPropertyDocuments } from './property-document-access';
import { PropertiesService } from './properties.service';

describe('property document visibility defaults', () => {
  const publicDocument = {
    accessLevel: 'Public' as const,
    name: 'Floor plan',
    fileName: 'floor-plan.pdf',
    fileUrl: 'https://example.org/floor-plan.pdf',
    fileObjectName: 'properties/documents/floor-plan.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1200,
  };
  const privateDocument = {
    accessLevel: 'AdminOnly' as const,
    name: 'Internal agreement',
    fileName: 'agreement.pdf',
    fileUrl: 'https://example.org/agreement.pdf',
    fileObjectName: 'properties/documents/agreement.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1200,
  };
  const legacyDocument = {
    name: 'Older document',
    fileName: 'legacy.pdf',
    fileUrl: 'https://example.org/legacy.pdf',
    fileObjectName: 'properties/documents/legacy.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1200,
  };

  it('keeps legacy documents private and exposes only explicit Public documents', () => {
    expect(propertyDocumentAccessLevel(undefined)).toBe('AdminOnly');
    expect(propertyDocumentAccessLevel('Private')).toBe('AdminOnly');
    expect(propertyDocumentAccessLevel('Public')).toBe('Public');
    expect(publicPropertyDocuments([privateDocument, legacyDocument, publicDocument]))
      .toEqual([publicDocument]);
  });

  it('does not leak private files or owner contact information from a public property API response', async () => {
    const service = new PropertiesService(
      {} as any,
      {} as any,
      {} as any,
      { predictPropertySales: jest.fn().mockResolvedValue(null) } as any,
      {} as any,
      {} as any,
      {} as any,
    );
    const property = Object.assign(new Property(), {
      id: 10,
      title: 'Test home',
      propertyDocuments: [legacyDocument, privateDocument, publicDocument],
      neighborhoodInsights: [],
      preQuestions: [],
      imageUrls: [],
      imageObjectNames: [],
      keyAmenities: [],
      ownerName: 'Private Owner',
      ownerEmail: 'private@example.org',
      ownerPhone: '+15550000001',
      agent: null,
    });

    const publicResult = await (service as any).mapProperty(property, false);
    expect(publicResult.propertyDocuments).toEqual([publicDocument]);
    expect(publicResult.ownerName).toBeUndefined();
    expect(publicResult.ownerEmail).toBeUndefined();

    const editorResult = await (service as any).mapProperty(property, true);
    expect(editorResult.propertyDocuments).toHaveLength(3);
    expect(editorResult.propertyDocuments[0].accessLevel).toBe('AdminOnly');
    expect(editorResult.propertyDocuments[1].accessLevel).toBe('AdminOnly');
  });

  it('keeps a private repository document private when editing unrelated fields', async () => {
    const saved = {
      id: 7,
      title: 'Sensitive agreement',
      fileName: 'agreement.pdf',
      fileUrl: 'https://example.org/agreement.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      documentType: DocumentType.Property,
      accessLevel: 'AdminOnly',
    };
    const repository = {
      findOne: jest.fn().mockResolvedValue(saved),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const service = new DocumentsService(repository as any);
    const result = await service.update(7, { description: 'New notes' });
    expect(result.accessLevel).toBe('AdminOnly');
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('defaults new repository Property documents to Public without changing other document types', () => {
    const service = new DocumentsService({} as any);
    const normalize = (service as any).normalize.bind(service);
    const base = {
      title: 'Floor plan',
      fileName: 'floor.pdf',
      fileUrl: 'https://example.org/floor.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
    };
    expect(normalize({ ...base, documentType: DocumentType.Property }).accessLevel)
      .toBe('Public');
    expect(normalize({
      ...base,
      documentType: DocumentType.Property,
      accessLevel: 'AdminOnly',
    }).accessLevel).toBe('AdminOnly');
    expect(normalize({ ...base, documentType: DocumentType.Other }).accessLevel)
      .toBe('AdminOnly');
  });
});
