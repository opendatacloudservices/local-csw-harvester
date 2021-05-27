export declare type CswSource = {
    url: string;
    limit: number;
    version: string;
};
export declare type CswRecords = {
    id: string;
};
export declare const getRecords: (cswSource: CswSource) => Promise<CswRecords[]>;
