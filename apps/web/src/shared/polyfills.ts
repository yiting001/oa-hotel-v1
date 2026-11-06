/* 旧版安卓浏览器与部分国产 WebView 的最小 API 补齐，必须在应用模块之前执行。 */
const arrayPrototype = Array.prototype as unknown as Record<string, unknown>;
const objectConstructor = Object as unknown as Record<string, unknown>;
const stringPrototype = String.prototype as unknown as Record<string, unknown>;

if (typeof arrayPrototype.at !== 'function') {
  arrayPrototype.at = function at<T>(this: T[], index: number): T | undefined {
    const length = this.length;
    const relative = Number(index) || 0;
    const absolute = relative < 0 ? length + relative : relative;
    return absolute < 0 || absolute >= length ? undefined : this[absolute];
  };
}

if (typeof arrayPrototype.findLast !== 'function') {
  arrayPrototype.findLast = function findLast<T>(
    this: T[],
    predicate: (value: T, index: number, array: T[]) => unknown,
    thisArg?: unknown,
  ): T | undefined {
    for (let index = this.length - 1; index >= 0; index -= 1) {
      if (predicate.call(thisArg, this[index], index, this)) return this[index];
    }
    return undefined;
  };
}

if (typeof arrayPrototype.findLastIndex !== 'function') {
  arrayPrototype.findLastIndex = function findLastIndex<T>(
    this: T[],
    predicate: (value: T, index: number, array: T[]) => unknown,
    thisArg?: unknown,
  ): number {
    for (let index = this.length - 1; index >= 0; index -= 1) {
      if (predicate.call(thisArg, this[index], index, this)) return index;
    }
    return -1;
  };
}

if (typeof arrayPrototype.toReversed !== 'function') {
  arrayPrototype.toReversed = function toReversed<T>(this: T[]): T[] {
    return this.slice().reverse();
  };
}

if (typeof arrayPrototype.toSorted !== 'function') {
  arrayPrototype.toSorted = function toSorted<T>(
    this: T[],
    compareFn?: (left: T, right: T) => number,
  ): T[] {
    return this.slice().sort(compareFn);
  };
}

if (typeof arrayPrototype.toSpliced !== 'function') {
  arrayPrototype.toSpliced = function toSpliced<T>(
    this: T[],
    start: number,
    deleteCount?: number,
    ...items: T[]
  ): T[] {
    const copy = this.slice();
    if (arguments.length < 2) copy.splice(start);
    else copy.splice(start, deleteCount as number, ...items);
    return copy;
  };
}

if (typeof objectConstructor.hasOwn !== 'function') {
  objectConstructor.hasOwn = function hasOwn(target: object, key: PropertyKey): boolean {
    return Object.prototype.hasOwnProperty.call(target, key);
  };
}

if (typeof stringPrototype.replaceAll !== 'function') {
  stringPrototype.replaceAll = function replaceAll(
    this: string,
    search: string | RegExp,
    replacement: string | ((substring: string, ...args: unknown[]) => string),
  ): string {
    const text = String(this);
    if (search instanceof RegExp) {
      if (!search.global) {
        throw new TypeError('replaceAll must be called with a global RegExp');
      }
      return text.replace(search, replacement as unknown as string);
    }
    const needle = String(search);
    if (needle === '') {
      const insert = typeof replacement === 'string' ? replacement : replacement('');
      return `${insert}${text.split('').join(insert)}${insert}`;
    }
    const insert = typeof replacement === 'string' ? replacement : replacement(needle);
    return text.split(needle).join(insert);
  };
}
