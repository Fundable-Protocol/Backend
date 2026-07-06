import { describe, it } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import { requireJwtAuthApi, requireAdminApi, requireSelfOrAdmin } from '../appMiddlewares/jwtAuth.api';
import appConfigs from '../config';
import type { IRequest } from '../types/global';
import type { Response, NextFunction } from 'express';

describe('JWT Auth Middleware', () => {
    // Mock response object
    const mockResponse = () => {
        const res: Partial<Response> = {};
        res.status = (code) => {
            res.statusCode = code;
            return res as Response;
        };
        res.json = (data) => {
            (res as any).body = data;
            return res as Response;
        };
        return res as Response;
    };

    const mockNext: NextFunction = () => {
        (mockNext as any).called = true;
    };

    const resetNext = () => {
        (mockNext as any).called = false;
    };

    const secret = appConfigs.authConfig.jwtSecret;

    describe('requireJwtAuthApi', () => {
        it('should return 401 if token is missing', () => {
            const req = { headers: {} } as IRequest;
            const res = mockResponse();
            resetNext();

            requireJwtAuthApi(req, res, mockNext);

            assert.strictEqual(res.statusCode, 401);
            assert.deepStrictEqual((res as any).body, {
                success: false,
                error: {
                    code: 'AUTH_MISSING_TOKEN',
                    message: 'Missing authentication token',
                    details: {}
                }
            });
            assert.strictEqual((mockNext as any).called, false);
        });

        it('should return 401 if token is invalid', () => {
            const req = { headers: { authorization: 'Bearer invalidtoken' } } as IRequest;
            const res = mockResponse();
            resetNext();

            requireJwtAuthApi(req, res, mockNext);

            assert.strictEqual(res.statusCode, 401);
            assert.strictEqual((res as any).body.success, false);
            assert.strictEqual((res as any).body.error.code, 'AUTH_INVALID_TOKEN');
            assert.strictEqual((mockNext as any).called, false);
        });

        it('should map sub to userId', () => {
            const token = jwt.sign({ sub: 'user123', email: 'test@test.com' }, secret);
            const req = { headers: { authorization: `Bearer ${token}` } } as IRequest;
            const res = mockResponse();
            resetNext();

            requireJwtAuthApi(req, res, mockNext);

            assert.strictEqual((mockNext as any).called, true);
            assert.strictEqual(req.auth?.userId, 'user123');
            assert.strictEqual(req.auth?.email, 'test@test.com');
            it('should return 401 with error details if verification throws an Error', () => {
            const req = { headers: { authorization: 'Bearer badtoken' } } as IRequest;
            const res = mockResponse();
            resetNext();

            requireJwtAuthApi(req, res, mockNext);

            assert.strictEqual(res.statusCode, 401);
            assert.strictEqual((res as any).body.error.code, 'AUTH_INVALID_TOKEN');
            assert.strictEqual(typeof (res as any).body.error.details.name, 'string');
            assert.strictEqual((mockNext as any).called, false);
        });
    });

        it('should map userId to userId', () => {
            const token = jwt.sign({ userId: 'user456' }, secret);
            const req = { headers: { authorization: `Bearer ${token}` } } as IRequest;
            const res = mockResponse();
            resetNext();

            requireJwtAuthApi(req, res, mockNext);

            assert.strictEqual((mockNext as any).called, true);
            assert.strictEqual(req.auth?.userId, 'user456');
        });

        it('should map id to userId', () => {
            const token = jwt.sign({ id: 'user789' }, secret);
            const req = { headers: { authorization: `Bearer ${token}` } } as IRequest;
            const res = mockResponse();
            resetNext();

            requireJwtAuthApi(req, res, mockNext);

            assert.strictEqual((mockNext as any).called, true);
            assert.strictEqual(req.auth?.userId, 'user789');
        });

        it('should return 401 if no valid user identifier is in token', () => {
            const token = jwt.sign({ someOtherField: 'value' }, secret);
            const req = { headers: { authorization: `Bearer ${token}` } } as IRequest;
            const res = mockResponse();
            resetNext();

            requireJwtAuthApi(req, res, mockNext);

            assert.strictEqual(res.statusCode, 401);
            assert.strictEqual((res as any).body.error.code, 'AUTH_INVALID_TOKEN');
            assert.strictEqual((mockNext as any).called, false);
        });

        it('should map walletAddress properly', () => {
            const token = jwt.sign({ sub: 'user1', walletAddress: '0x123' }, secret);
            const req = { headers: { authorization: `Bearer ${token}` } } as IRequest;
            const res = mockResponse();
            resetNext();

            requireJwtAuthApi(req, res, mockNext);

            assert.strictEqual((mockNext as any).called, true);
            assert.strictEqual(req.auth?.walletAddress, '0x123');
        });

        it('should map address to walletAddress properly', () => {
            const token = jwt.sign({ sub: 'user1', address: '0x456' }, secret);
            const req = { headers: { authorization: `Bearer ${token}` } } as IRequest;
            const res = mockResponse();
            resetNext();

            requireJwtAuthApi(req, res, mockNext);

            assert.strictEqual((mockNext as any).called, true);
            assert.strictEqual(req.auth?.walletAddress, '0x456');
        });
    });

    describe('requireAdminApi', () => {
        it('should allow super-admin role', () => {
            const req = { auth: { claims: { role: 'super-admin' } } } as unknown as IRequest;
            const res = mockResponse();
            resetNext();

            requireAdminApi(req, res, mockNext);

            assert.strictEqual((mockNext as any).called, true);
        });

        it('should allow admin role', () => {
            const req = { auth: { claims: { role: 'admin' } } } as unknown as IRequest;
            const res = mockResponse();
            resetNext();

            requireAdminApi(req, res, mockNext);

            assert.strictEqual((mockNext as any).called, true);
        });

        it('should allow super-admin userType', () => {
            const req = { auth: { claims: { userType: 'super-admin' } } } as unknown as IRequest;
            const res = mockResponse();
            resetNext();

            requireAdminApi(req, res, mockNext);

            assert.strictEqual((mockNext as any).called, true);
        });

        it('should forbid non-admin users', () => {
            const req = { auth: { claims: { role: 'user', userType: 'regular' } } } as unknown as IRequest;
            const res = mockResponse();
            resetNext();

            requireAdminApi(req, res, mockNext);

            assert.strictEqual(res.statusCode, 403);
            assert.strictEqual((res as any).body.error.code, 'FORBIDDEN');
            assert.strictEqual((mockNext as any).called, false);
        });
    });

    describe('requireSelfOrAdmin', () => {
        it('should allow if params.userId matches auth.userId', () => {
            const req = { params: { userId: 'self123' }, auth: { userId: 'self123' } } as unknown as IRequest;
            const res = mockResponse();
            resetNext();

            requireSelfOrAdmin(req, res, mockNext);

            assert.strictEqual((mockNext as any).called, true);
        });

        it('should allow if user is admin (role)', () => {
            const req = { params: { userId: 'other123' }, auth: { userId: 'admin1', claims: { role: 'admin' } } } as unknown as IRequest;
            const res = mockResponse();
            resetNext();

            requireSelfOrAdmin(req, res, mockNext);

            assert.strictEqual((mockNext as any).called, true);
        });

        it('should allow if user is admin (userType)', () => {
            const req = { params: { userId: 'other123' }, auth: { userId: 'admin1', claims: { userType: 'super-admin' } } } as unknown as IRequest;
            const res = mockResponse();
            resetNext();

            requireSelfOrAdmin(req, res, mockNext);

            assert.strictEqual((mockNext as any).called, true);
        });

        it('should forbid if user is neither self nor admin', () => {
            const req = { params: { userId: 'other123' }, auth: { userId: 'self123', claims: { role: 'user' } } } as unknown as IRequest;
            const res = mockResponse();
            resetNext();

            requireSelfOrAdmin(req, res, mockNext);

            assert.strictEqual(res.statusCode, 403);
            assert.strictEqual((res as any).body.error.code, 'FORBIDDEN');
            assert.strictEqual((mockNext as any).called, false);
        });
    });
});
