import { existsSync, readdirSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

describe('NestJS source integrity', () => {
  const srcRoot = __dirname;

  const sourceFiles = (directory: string): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        return sourceFiles(fullPath);
      }

      if (
        extname(entry.name) !== '.ts' ||
        entry.name.endsWith('.spec.ts') ||
        entry.name === 'main.ts'
      ) {
        return [];
      }

      return [fullPath];
    });

  const files = sourceFiles(srcRoot);

  it('discovers application source files', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it.each(files.map((file) => [relative(srcRoot, file), file]))(
    'loads %s without import-time errors',
    (_displayName, file) => {
      expect(existsSync(file)).toBe(true);
      expect(() => require(file)).not.toThrow();
    },
  );

  it('keeps every feature module importable', () => {
    const moduleFiles = files.filter((file) => file.endsWith('.module.ts'));
    expect(moduleFiles.length).toBeGreaterThan(10);

    for (const file of moduleFiles) {
      const exports = require(file) as Record<string, unknown>;
      expect(Object.keys(exports).length).toBeGreaterThan(0);
    }
  });

  it('keeps controllers and services exported', () => {
    const componentFiles = files.filter(
      (file) => file.endsWith('.controller.ts') || file.endsWith('.service.ts'),
    );

    for (const file of componentFiles) {
      const exports = require(file) as Record<string, unknown>;
      const exportedValues = Object.values(exports);
      expect(exportedValues.length).toBeGreaterThan(0);
      expect(exportedValues.some((value) => typeof value === 'function')).toBe(true);
    }
  });

  it('does not accidentally include generated output in src', () => {
    expect(files.some((file) => file.split(sep).includes('dist'))).toBe(false);
  });
});
