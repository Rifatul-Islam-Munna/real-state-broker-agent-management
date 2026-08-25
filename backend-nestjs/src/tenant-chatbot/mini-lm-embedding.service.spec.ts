import { Test } from '@nestjs/testing';
import { MiniLmEmbeddingService } from './mini-lm-embedding.service';

describe('MiniLmEmbeddingService', () => {
  it('loads once and requests normalized mean-pooled embeddings', async () => {
    const output = {
      tolist: jest.fn(() => [Array.from({ length: 384 }, () => 0.25)]),
    };
    const extractor = jest.fn(async () => output);
    const loader = jest.fn(async () => extractor);
    const service = new MiniLmEmbeddingService(loader);

    const first = await service.embed('Is parking available?');
    const second = await service.embed('What is the rent?');

    expect(loader).toHaveBeenCalledTimes(1);
    expect(extractor).toHaveBeenNthCalledWith(1, 'Is parking available?', {
      pooling: 'mean',
      normalize: true,
    });
    expect(first).toHaveLength(384);
    expect(second).toHaveLength(384);
  });

  it('rejects malformed model output instead of indexing it', async () => {
    const service = new MiniLmEmbeddingService(async () =>
      jest.fn(async () => ({
        tolist: () => [[0.1, 0.2, 0.3]],
      })),
    );

    await expect(service.embed('bad vector')).rejects.toThrow(
      '384-dimensional',
    );
  });

  it('rejects non-finite values', async () => {
    const vector = Array.from({ length: 384 }, () => 0.1);
    vector[7] = Number.NaN;
    const service = new MiniLmEmbeddingService(async () =>
      jest.fn(async () => ({
        tolist: () => [vector],
      })),
    );

    await expect(service.embed('bad number')).rejects.toThrow('finite numbers');
  });
  it('warms the model once so backend startup downloads or reuses the cached model', async () => {
    const extractor = jest.fn(async () => ({
      tolist: () => [Array.from({ length: 384 }, () => 0.2)],
    }));
    const loader = jest.fn(async () => extractor);
    const service = new MiniLmEmbeddingService(loader);

    await service.warmup();
    await service.embed('cached after startup');

    expect(loader).toHaveBeenCalledTimes(1);
    expect(extractor).toHaveBeenCalledTimes(1);
  });
  it('warms automatically during Nest application bootstrap', async () => {
    const loader = jest.fn(async () =>
      jest.fn(async () => ({
        tolist: () => [Array.from({ length: 384 }, () => 0.3)],
      })),
    );
    const service = new MiniLmEmbeddingService(loader);

    await service.onApplicationBootstrap();

    expect(loader).toHaveBeenCalledTimes(1);
  });
  it('can be instantiated by Nest without a loader injection token', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [MiniLmEmbeddingService],
    }).compile();
    expect(moduleRef.get(MiniLmEmbeddingService)).toBeInstanceOf(
      MiniLmEmbeddingService,
    );
    await moduleRef.close();
  });
});
