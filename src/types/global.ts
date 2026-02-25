import { Request } from 'express';
import platformConstants from '../config/platformConstants';

import WalletEntity from '../components/v1/wallet/wallet.entity';
import { RoleEntity } from '../components/v1/platform/platformEntities/permission.entity';
import PlatformEntity from '../components/v1/platform/platformEntities/platform.entity';

export interface DocTimestamps {
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IPaginationData {
    currentPage: number;
    perPage: number;
    paginationQueryOptions: {
        sort: { _id: -1 };
        skip: number;
        limit: number;
    };
}

export interface IToken {
    authKey?: string;
    deviceId?: string;
    platformId?: string;
    userType: (typeof platformConstants.userTypes)[number];
    sessionId: string;
    ref: number;
    role: string;
}

export interface GenerateTokenArg {
    data: IToken;
    expiresIn?: string;
    audience?: (typeof platformConstants.userTypes)[number];
    jwtSecret?: string;
}

export interface FingerPrintData {
    browser: string;
    device: string;
    ipAddress: string;
    country: string;
    region: string;
    city: string;
    long: number;
    lat: number;
}

export interface GeoInfo {
    range: [number, number];
    country: string;
    region: string;
    timezone: string;
    city: string;
    ll: [number, number];
    metro: number;
    area: number;
}

export interface FingerprintResult {
    hash: string;
    components: {
        userAgent: string;
        language?: string;
        ip: string;
    };
}

// export interface IReqFile {
//     fieldname: string;
//     originalname: string;
//     mimetype?: string;
//     size: number;
//     buffer: Buffer;
// }

export interface IRequest extends Request {
    decoded?: IToken;
    fingerprint?: FingerprintResult;
    Wallet?: WalletEntity | null;
    role?: RoleEntity;
    platform?: PlatformEntity;
    userType?: (typeof platformConstants.userTypes)[number];
    // file?: Request['file'];
    permissions?: string[];
    paginationData?: IPaginationData;
}

export interface AppErrorAttributes {
    name?: string;
    message: string;
    httpCode?: number;
    extra?: Record<string, unknown>;
    type?: 'OPERATIONAL' | 'API' | 'CRITICAL';
}

export interface MailArgAttributes {
    to: string;
    subject: string;
    from?: string;
    type?: (typeof platformConstants.emailType)[number];
    html?: string;
    content?: string;
}

export interface sessionArg {
    req?: IRequest;
    sessionLifeSpan?: string;
    maxInactivity?: string;
}

export type PerPageType =
    (typeof platformConstants.paginationConfig.allowedPerPageValues)[number];

export interface PaginationData {
    currentPage: number;
    perPage: PerPageType;
    paginationQueryOptions: {
        sort: { _id: number };
        skip: number;
        limit: PerPageType;
    };
}

export interface MetaData {
    totalRows: number;
    totalPages: number;
    currentPage: number;
    perPage: PerPageType;
    nextPage: number | null;
    prevPage: number | null;
}

export type MetaFunction = (_count: number) => MetaData;

export interface PaginationResult {
    paginationData: PaginationData;
    queryOptions: PaginationData['paginationQueryOptions'];
    getMeta: MetaFunction;
}

export type supportedCountryType =
    (typeof platformConstants.supportedCountries)[number];

export interface ImgData {
    key: string;
    content: Buffer | string;
    mimeType?: string;
}

export interface UploadResponse {
    success: boolean;
    imgUrl?: string;
    message?: string;
    error?: Error;
}
