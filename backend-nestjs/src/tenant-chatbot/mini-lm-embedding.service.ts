import { Logger, OnApplicationBootstrap } from '@nestjs/common';

type TensorLike = {
  tolist(): unknown;
};

export type MiniLmExtractor = (
  text: string,
  options: { pooling: 'mean'; normalize: true },
) => Promise<TensorLike>;

export type MiniLmLoader = () => Promise<MiniLmExtractor>;

export class MiniLmEmbeddingService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MiniLmEmbeddingService.name);
  private extractorPromise?: Promise<MiniLmExtractor>;

  constructor(private readonly loader: MiniLmLoader = defaultMiniLmLoader) {}

  async onApplicationBootstrap() {
    try {
      await this.warmup();
      this.logger.log('Chatbot embedding model is ready.');
    } catch (error) {
      this.logger.error(
        `Chatbot embedding model startup failed: ${message(error)}`,
      );
    }
  }

  async warmup() {
    await this.loadExtractor();
  }

  async embed(text: string): Promise<number[]> {
    const input = text.trim();
    if (!input) throw new Error('Embedding text is required.');

    const extractor = await this.loadExtractor();
    const tensor = await extractor(input, {
      pooling: 'mean',
      normalize: true,
    });
    const vector = unwrapVector(tensor.tolist());

    if (vector.length !== 384) {
      throw new Error(
        `all-MiniLM-L6-v2 must return a 384-dimensional vector; received ${vector.length}.`,
      );
    }
    if (!vector.every((value) => Number.isFinite(value))) {
      throw new Error('Embedding vectors must contain only finite numbers.');
    }
    return vector;
  }

  private loadExtractor() {
    this.extractorPromise ??= this.loader().catch((error) => {
      this.extractorPromise = undefined;
      throw error;
    });
    return this.extractorPromise;
  }
}

async function defaultMiniLmLoader(): Promise<MiniLmExtractor> {
  const dynamicImport = new Function(
    'modulePath',
    'return import(modulePath)',
  ) as (modulePath: string) => Promise<any>;
  const transformers = await dynamicImport('@huggingface/transformers');

  const cacheDir =
    process.env.CHATBOT_MODEL_PATH?.trim() || '.cache/chatbot-models';
  transformers.env.cacheDir = cacheDir;
  transformers.env.allowRemoteModels =
    process.env.CHATBOT_ALLOW_REMOTE_MODELS !== 'false';

  const model =
    process.env.CHATBOT_EMBEDDING_MODEL?.trim() || 'Xenova/all-MiniLM-L6-v2';
  const pipeline = await transformers.pipeline('feature-extraction', model, {
    device: 'cpu',
  });

  return async (text, options) => pipeline(text, options);
}

function unwrapVector(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  if (value.length === 1 && Array.isArray(value[0])) {
    return (value[0] as unknown[]).map(Number);
  }
  return value.map(Number);
}

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
