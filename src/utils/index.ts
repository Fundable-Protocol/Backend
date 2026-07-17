import { ulid as ulidx } from 'ulidx';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import type { EntityManager } from 'typeorm';

import { IRequest } from '../types/global';
import { logError } from './logger';

export const isValidUuid = (uuid: string): boolean => {
    const result = z.string().uuid().safeParse(uuid);
    return result.success;
};

/**
 * Executes a transaction with the given callback.
 * @param transactionCallback - A callback that performs the transaction logic.
 */
export async function executeTransaction<T>(
    transactionCallback: (
        _transactionManager: EntityManager
    ) => Promise<T>
): Promise<T> {
    const { default: AppDataSource } = await import(
        '../config/persistence/data-source'
    );

    return AppDataSource.transaction(async (transactionManager) => {
        try {
            return await transactionCallback(transactionManager);
        } catch (error) {
            logError('Transaction failed', error);
            throw error;
        }
    });
}

export const uuid = () => randomUUID();

export const ulid = () => ulidx();

export const redefinePhoneNo = (val: string) => {
    const newVal = val.replace(/\s/g, '');

    if (newVal.startsWith('+')) return newVal.replace('+', '');
    if (newVal.startsWith('0')) return newVal.slice(1);

    return newVal;
};

export const isValidDate = (value: string | Date) => {
    const date = new Date(value);
    return !isNaN(date.getTime());
};

export const generateRandomCode = (length = 6): string => {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    const randomCode = Math.floor(Math.random() * (max - min + 1) + min);

    return randomCode.toString();
};

export const generateBackupCodes = (length = 5) => {
    return Array.from({ length }, () =>
        Math.random().toString(36).slice(-8).toUpperCase()
    );
};

// export const AxiosErrorHandler = (err: unknown) => {
//     let message = '',
//         name: string | null = 'AxiosError';
//     const axiosErr = err as AxiosError;

//     if (axiosErr.response) {
//         message =
//             JSON.stringify(axiosErr.response.data, null, 2) || axiosErr.message;
//         name = axiosErr.name;
//     } else if (axiosErr?.request) {
//         message = axiosErr?.request?.data;
//     } else {
//         message = axiosErr?.message;
//     }

//     throw new AppError({
//         name,
//         message,
//         httpCode: 500,
//         type: 'OPERATIONAL',
//     });
// };

export const getIpAddress = (req: IRequest): string => {
    const { headers, ip, socket } = req;

    const xForwardedFor = headers['x-forwarded-for'];

    const xForwardedForIp = Array.isArray(xForwardedFor)
        ? xForwardedFor[0]
        : typeof xForwardedFor === 'string'
          ? xForwardedFor.split(',')[0]
          : undefined;

    return (
        (headers['x-real-ip'] as string) ||
        xForwardedForIp ||
        ip ||
        socket.remoteAddress ||
        ''
    );
};

export const convertDateToTimeStamp = (date?: Date | number | string) => {
    return date ? new Date(date).getTime() : Date.now();
};

export function transformObjectValues<T, U>(
    obj: Record<string, T>,
    func: (_value: T) => U
): Record<string, U> {
    const transformedData: Record<string, U> = {};

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            transformedData[key] = func(obj[key]);
        }
    }

    return transformedData;
}

export const encodeToBase64 = (value: unknown): unknown => {
    return typeof value !== 'string'
        ? value
        : Buffer.from(value, 'utf-8').toString('base64');
};

export const decodeFromBase64 = (base64Text: unknown): unknown => {
    return typeof base64Text !== 'string'
        ? base64Text
        : Buffer.from(base64Text, 'base64').toString('utf-8');
};

export const getIpAddressAndUserAgent = (req: IRequest) => {
    const ipAddress = getIpAddress(req);

    const userAgent = req.headers['user-agent'] || '';

    return { ipAddress, userAgent };
};

export const getUniqueIds = (ids: string[]): string[] =>
    Array.from(new Set(ids));

export const getUniqueNos = (ids: number[]) =>
    Array.from(new Set(ids.map((perm) => +perm)));
