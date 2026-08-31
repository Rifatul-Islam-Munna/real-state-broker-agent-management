import { Test } from '@nestjs/testing';
import { MiniLmEmbeddingService } from './mini-lm-embedding.service';

describe('MiniLmEmbeddingService', () => {
  it('loads once and uses Arctic query/document conventions', async () => {
    const output = {
      tolist: jest.fn(() => [Array.from({ length: 384 }, () => 0.25)]),
    };
    const extractor = jest.fn(async () => output);
    const loader = jest.fn(async () => extractor);
    const service = new MiniLmEmbeddingService(loader);

    const first = await service.embed('Is parking available?', 'query');
    const second = await service.embed('Parking: 1 assigned spot', 'document');

    expect(loader).toHaveBeenCalledTimes(1);
    expect(extractor).toHaveBeenNthCalledWith(
      1,
      'Represent this sentence for searching relevant passages: Is parking available?',
      { pooling: 'cls', normalize: true },
    );
    expect(extractor).toHaveBeenNthCalledWith(2, 'Parking: 1 assigned spot', {
      pooling: 'cls',
      normalize: true,
    });
    expect(first).toHaveLength(384);
    expect(second).toHaveLength(384);
    expect(service.modelSignature()).toContain('snowflake-arctic-embed-xs');
  });

  it('serializes embedding inference by default for low-resource CPUs', async () => {
    let active = 0;
    let maxActive = 0;
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    let call = 0;
    const extractor = jest.fn(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      call += 1;
      if (call === 1) await firstGate;
      active -= 1;
      return { tolist: () => [Array.from({ length: 384 }, () => 0.1)] };
    });
    const service = new MiniLmEmbeddingService(async () => extractor);

    const one = service.embed('first', 'query');
    const two = service.embed('second', 'query');
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(maxActive).toBe(1);
    releaseFirst();
    await Promise.all([one, two]);
    expect(maxActive).toBe(1);
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

