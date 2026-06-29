export function numericEnumTransformer<T extends string>(values: readonly T[], fallback: T) {
  return {
    to: (value: T | string | number) => typeof value === 'number' ? value : Math.max(0, values.indexOf((value ?? fallback) as T)),
    from: (value: number) => values[value] ?? fallback,
  };
}

export function numericEnumValue<T extends string>(values: readonly T[], value: T | string | number) {
  return typeof value === 'number' ? value : Math.max(0, values.indexOf(value as T));
}
