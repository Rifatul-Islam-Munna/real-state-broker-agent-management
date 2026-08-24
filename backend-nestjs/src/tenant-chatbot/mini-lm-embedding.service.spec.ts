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
});
