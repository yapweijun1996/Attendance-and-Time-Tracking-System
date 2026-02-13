import PouchDB from "pouchdb-browser";

export interface SyncOptions extends PouchDB.Replication.SyncOptions {
  live?: boolean;
  retry?: boolean;
}

class PouchDBService {
  private static instance: PouchDBService;
  private db: PouchDB.Database | null = null;
  private readonly defaultDbName = "satts_db";

  private constructor() {}

  static getInstance(): PouchDBService {
    if (!PouchDBService.instance) {
      PouchDBService.instance = new PouchDBService();
    }
    return PouchDBService.instance;
  }

  private assertBrowserSupport(): void {
    if (typeof indexedDB === "undefined") {
      throw new Error(
        "PouchDB IndexedDB adapter is unavailable in this runtime. Use browser mode or inject a test database."
      );
    }
  }

  init(dbName = this.defaultDbName): PouchDB.Database {
    if (!this.db) {
      this.assertBrowserSupport();
      this.db = new PouchDB(dbName);
    }
    return this.db;
  }

  getDatabase(): PouchDB.Database {
    return this.init();
  }

  setDatabase(database: PouchDB.Database): void {
    this.db = database;
  }

  async put<T extends Record<string, unknown>>(
    doc: PouchDB.Core.PutDocument<T>
  ): Promise<PouchDB.Core.Response> {
    const database = this.getDatabase();
    return database.put(doc);
  }

  async get<T extends Record<string, unknown>>(
    id: string
  ): Promise<PouchDB.Core.Document<T & PouchDB.Core.IdMeta>> {
    const database = this.getDatabase();
    return database.get<T>(id);
  }

  sync(
    remoteUrl: string,
    options: SyncOptions = { live: true, retry: true }
  ): PouchDB.Replication.Sync<Record<string, unknown>> {
    const database = this.getDatabase();
    return database.sync<Record<string, unknown>>(remoteUrl, options);
  }
}

const pouchDBService = PouchDBService.getInstance();

export { PouchDBService, pouchDBService };
