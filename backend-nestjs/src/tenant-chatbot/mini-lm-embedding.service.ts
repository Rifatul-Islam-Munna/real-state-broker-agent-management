import { Logger, OnApplicationBootstrap } from '@nestjs/common';

type TensorLike = {
  tolist(): unknown;
};

export type ChatbotEmbeddingKind = 'query' | 'document';
export type ChatbotEmbeddingPooling = 'cls' | 'mean';
export type MiniLmExtractor = (
  text: string,
  options: { pooling: ChatbotEmbeddingPooling; normalize: true },
) => Promise<TensorLike>;
export type MiniLmLoader = () => Promise<MiniLmExtractor>;

const DEFAULT_MODEL = 'Snowflake/snowflake-arctic-embed-xs';
const DEFAULT_DTYPE = 'q8';
const QUERY_PREFIX = 'Represent this sentence for searching relevant passages: ';

export class MiniLmEmbeddingService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MiniLmEmbeddingService.name);
  private extractorPromise?: Promise<MiniLmExtractor>;
  private inferenceTail: Promise<void> = Promise.resolve();

  constructor(private readonly loader: MiniLmLoader = defaultMiniLmLoader) {}

  async onApplicationBootstrap() {
    try {
      await this.warmup();
      this.logger.log(`Chatbot embedding model is ready: ${this.modelSignature()}.`);
    } catch (error) {
      this.logger.error(
        `Chatbot embedding model startup failed: ${message(error)}`,
      );
    }
  }

  async warmup() {
    await this.loadExtractor();
  }

  modelSignature() {
    const model = configuredEmbeddingModel().toLowerCase();
    const dtype = configuredEmbeddingDtype().toLowerCase();
    return `${model}|${dtype}|384|cls|arctic-query-v1`;
  }

  async embed(
    text: string,
    kind: ChatbotEmbeddingKind = 'document',
  ): Promise<number[]> {
    const input = text.trim();
    if (!input) throw new Error('Embedding text is required.');

    return this.serializeInference(async () => {
      const extractor = await this.loadExtractor();
      const prepared = kind === 'query' ? `${QUERY_PREFIX}${input}` : input;
      const tensor = await extractor(prepared, {
        pooling: 'cls',
        normalize: true,
      });
      const vector = unwrapVector(tensor.tolist());

      if (vector.length !== 384) {
        throw new Error(
          `Chatbot embedding model must return a 384-dimensional vector; received ${vector.length}.`,
        );
      }
      if (!vector.every((value) => Number.isFinite(value))) {
        throw new Error('Embedding vectors must contain only finite numbers.');
      }
      return vector;
    });
  }

  private serializeInference<T>(work: () => Promise<T>): Promise<T> {
    const run = this.inferenceTail.then(work, work);
    this.inferenceTail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
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

  transformers.env.cacheDir =
    process.env.CHATBOT_MODEL_PATH?.trim() || '.cache/chatbot-models';
  transformers.env.allowRemoteModels =
    process.env.CHATBOT_ALLOW_REMOTE_MODELS !== 'false';

  const pipeline = await transformers.pipeline(
    'feature-extraction',
    configuredEmbeddingModel(),
    {
      device: 'cpu',
      dtype: configuredEmbeddingDtype(),
    },
  );

  return async (text, options) => pipeline(text, options);
}

function configuredEmbeddingModel() {
  return process.env.CHATBOT_EMBEDDING_MODEL?.trim() || DEFAULT_MODEL;
}

function configuredEmbeddingDtype() {
  return process.env.CHATBOT_EMBEDDING_DTYPE?.trim() || DEFAULT_DTYPE;
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
