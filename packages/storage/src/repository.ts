/**
 * One repository per data type — never one giant repository. See
 * docs/12-storage/overview.md "Repositories".
 */
export interface IRepository<T> {
  create(item: T): Promise<void>;
  update(item: T): Promise<void>;
  delete(id: string): Promise<void>;
  get(id: string): Promise<T | undefined>;
  list(): Promise<T[]>;
}
