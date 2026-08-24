type TensorLike = {
  tolist(): unknown;
};

export type MiniLmExtractor = (
  text: string,
  options: { pooling: 'mean'; normalize: true },
) => Promise<TensorLike>;

export type MiniLmLoader = () => Promise<MiniLmExtractor>;

export class MiniLmEmbeddingService {
  private extractorPromise?: Promise<MiniLmExtractor>;

  constructor(private readonly loader: MiniLmLoader = defaultMiniLmLoader) {}

  async embed(text: string): Promise<number[]> {
    const input = text.trim();
    if (!input) throw new Error('Embedding text is required.');

    this.extractorPromise ??= this.loader();
    const extractor = await this.extractorPromise;
    const tensor = await extractor(input, {
      pooling: 'mean',
      normalize: true,
    });
    const listed = tensor.tolist();
    const vector = unwrapVector(listed);

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
}

async function defaultMiniLmLoader(): Promise<MiniLmExtractor> {
  const dynamicImport = new Function(
    'modulePath',
    'return import(modulePath)',
  ) as (modulePath: string) => Promise<any>;
  const transformers = await dynamicImport('@huggingface/transformers');

  const localModelPath = process.env.CHATBOT_MODEL_PATH?.trim();
  if (localModelPath) {
    transformers.env.localModelPath = localModelPath;
  }
  transformers.env.allowRemoteModels =
    process.env.NODE_ENV !== 'production' &&
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
