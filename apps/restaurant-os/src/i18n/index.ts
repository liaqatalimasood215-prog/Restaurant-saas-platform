import { en } from './en';

type Messages = typeof en;

type StringPaths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends readonly string[]
      ? never
      : StringPaths<T[K], `${P}${K}.`>;
}[keyof T & string];

type ListPaths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends readonly string[]
    ? `${P}${K}`
    : T[K] extends string
      ? never
      : ListPaths<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MessageKey = StringPaths<Messages>;
export type ListKey = ListPaths<Messages>;

function lookup(key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], en);
}

/** UI text by key, with {name} placeholders filled in. */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const text = lookup(key);
  if (typeof text !== 'string') return key;
  return vars ? text.replace(/\{(\w+)\}/g, (match, name: string) => String(vars[name] ?? match)) : text;
}

/** A list of UI texts by key. */
export function tList(key: ListKey): readonly string[] {
  const list = lookup(key);
  return Array.isArray(list) ? (list as string[]) : [];
}
