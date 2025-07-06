import { z } from 'zod';

import { isValidUserId } from '../helper';

const stringPattern = z.string().trim();

const validString = stringPattern
    .min(2, 'Field cannot be empty')
    .max(255, 'Character is too long');

const validCustomIdString = stringPattern.regex(/^[a-zA-Z0-9]+$/, 'invalid id');

const validPasswordString = z
    .string()
    .min(8, 'must be at least 8 characters long') // Length check
    .regex(/[a-z]/, 'must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'must contain at least one uppercase letter')
    .regex(/\d/, 'must contain at least one digit')
    .regex(
        /[@_$!-.]/,
        'must contain at least one special character between @$!&.'
    );

const validPinString = z
    .string()
    .length(4, 'must be 4 digit') // Length check
    .regex(/\d/, 'must contain 4 digit');

const validEmailString = stringPattern.email().trim().min(3);

const validUrlString = stringPattern.url().min(3);

const validNumber = z.number().int().nonnegative();

const validPositiveNumber = z.number().int().positive();

const validPageMetaNo = validString
    .transform((val) => +val)
    .refine((val) => val >= 1)
    .optional();

const validUserId = stringPattern.refine(
    (userId) => isValidUserId(userId),
    'Invalid user Id'
);

const validCountryCodeString = validString.trim().toLowerCase().length(2);
export {
    stringPattern,
    validString,
    validPasswordString,
    validPinString,
    validEmailString,
    validUrlString,
    validNumber,
    validPositiveNumber,
    validPageMetaNo,
    validUserId,
    validCountryCodeString,
    validCustomIdString,
};
