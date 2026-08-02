export function cloneJsonModel<T>(value: T): T {
  // Designer models are persisted as JSON; serialization also unwraps Vue reactive proxies.
  return JSON.parse(JSON.stringify(value)) as T;
}
