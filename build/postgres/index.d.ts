import { Client } from 'pg';
import { CswRecord, CswSource, fetchOptions } from '../csw/types';
export declare const resetQueues: (client: Client) => Promise<void>;
export declare const initMasterTable: (client: Client) => Promise<void>;
export declare const createInstance: (client: Client, cswSource: CswSource) => Promise<void>;
export declare const getInstance: (client: Client, id: string) => Promise<CswSource>;
export declare const getAllInstances: (client: Client) => Promise<CswSource[]>;
export declare const resetTables: (client: Client, prefix: string) => Promise<void>;
export declare const insertQueue: (client: Client, prefix: string, queue: {
    url: string;
    options: fetchOptions;
}[]) => Promise<void>;
export declare const nextPackage: (client: Client, cswSource: CswSource) => Promise<string | null>;
export declare const getQueueItem: (client: Client, prefix: string, id: number) => Promise<{
    url: string;
    options: fetchOptions;
}>;
export declare const removeFromQueue: (client: Client, cswSource: CswSource, url: string) => Promise<void>;
export declare const setQueueFailed: (client: Client, cswSource: CswSource, url: string) => Promise<void>;
export declare const processPackages: (client: Client, cswSource: CswSource, cswRecords: CswRecord[]) => Promise<void>;
export declare const formatArray: (array: (string | number | boolean | null)[] | null) => string | null;
