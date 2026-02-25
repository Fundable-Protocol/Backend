import { Response } from 'express';
import { z } from 'zod';

import { validCustomIdString } from '../types/general-policy';

export const handleResponse = (res: Response, data: unknown, status = 200) => {
    const success = status >= 400 ? false : true;

    if (typeof data === 'string') {
        return res.status(status).json({ success, message: data });
    }
    return res.status(status).json({
        success,
        message: 'Ok',
        ...(data as Record<string, unknown>),
    });
};

export function capitalizeString(input: string): string {
    return input?.replace(/\b\w/g, (char) => char.toUpperCase());
}

export const isValidPlatformId = (val: string) =>
    val?.toLowerCase() === 'system' || z.string().uuid().safeParse(val).success;

export const isValidUserId = (userId: string) => {
    const isValidUUID = z.string().uuid().safeParse(userId).success;
    const isValidULID = z.string().ulid().safeParse(userId).success;
    const isValidCustomId = validCustomIdString.safeParse(userId).success;

    return isValidUUID || isValidULID || isValidCustomId;
};

export function u256FromString(value: string): { low: bigint; high: bigint } {
    if (!/^\d+$/.test(value) && !/^0x[0-9a-fA-F]+$/.test(value)) {
        throw new TypeError(`Invalid u256 string: "${value}"`);
    }
    const big = BigInt(value);
    const U256_MAX = (1n << 256n) - 1n;
    if (big <= 0n || big > U256_MAX) {
        throw new RangeError(`u256 must be in range 1..2^256-1, got: "${value}"`);
    }
    const low = big & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
    const high = big >> 128n;
    return { low, high };
}

export function isValidContractAddress(address: string): boolean {
    return /^0x[0-9a-fA-F]{64}$/.test(address);
}

export function isValidBase64String(field: string) {
    // Regular expression for Base64 validation
    const base64Pattern =
        /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

    // Check if it's a valid Base64 string
    const isBase64 = base64Pattern.test(field);

    return isBase64;
}
