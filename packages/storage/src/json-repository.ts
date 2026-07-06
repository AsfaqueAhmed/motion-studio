import { decodeJson, encodeJson } from "./json-codec";
import type { IRepository } from "./repository";
import type { IVFS } from "./vfs";

/**
 * Generic `IRepository<T>` backed by one JSON blob per id under
 * `${directory}/${id}.json` in the VFS. Concrete repositories (thumbnails,
 * waveforms, ...) extend this instead of re-implementing JSON (de)serialization.
 * ProjectRepository does not extend this — its `save/load` API and
 * backup-before-migrate behavior are specific enough to stand alone.
 */
export abstract class JsonRepository<T extends { id: string }> implements IRepository<T> {
  protected constructor(
    protected readonly vfs: IVFS,
    protected readonly directory: string,
  ) {}

  async create(item: T): Promise<void> {
    await this.write(item);
  }

  async update(item: T): Promise<void> {
    await this.write(item);
  }

  async delete(id: string): Promise<void> {
    await this.vfs.delete(this.pathFor(id));
  }

  async get(id: string): Promise<T | undefined> {
    const data = await this.vfs.read(this.pathFor(id));
    return data ? this.deserialize(data) : undefined;
  }

  async list(): Promise<T[]> {
    const paths = await this.vfs.list(`${this.directory}/`);
    const items: (T | undefined)[] = await Promise.all(
      paths.map(async (path): Promise<T | undefined> => {
        const data = await this.vfs.read(path);
        return data ? this.deserialize(data) : undefined;
      }),
    );
    return items.filter((item): item is T => item !== undefined);
  }

  protected pathFor(id: string): string {
    return `${this.directory}/${id}.json`;
  }

  private deserialize(data: Uint8Array): T {
    return decodeJson<T>(data);
  }

  private async write(item: T): Promise<void> {
    await this.vfs.write(this.pathFor(item.id), encodeJson(item));
  }
}
