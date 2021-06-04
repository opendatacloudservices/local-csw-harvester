import { CswSource, CswRecord, fetchOptions } from './types';
export declare const packageList: (cswSource: CswSource) => Promise<{
    url: string;
    options: fetchOptions;
}[]>;
export declare const packageShow: (queueItem: {
    url: string;
    options: fetchOptions;
}) => Promise<CswRecord[]>;
