import { NextFunction, Response } from 'express';

import { IRequest } from '../../../types/global';
import { InvalidRequestError } from '../../../utils/errorHandler';
import platformRepository from './platformServices/platform.services';
import {
    PermissionEntity,
    RoleEntity,
} from './platformEntities/permission.entity';

export function validatePermissionValue(word: string) {
    const regex = /^(view|add|edit|delete)_[a-z]+(_[a-z]+)*$/;

    return regex.test(word);
}

export const getPlatformMiddleware = async (
    req: IRequest,
    _res: Response,
    next: NextFunction
) => {
    const platform = await platformRepository.findOne({});

    if (!platform) throw new InvalidRequestError();

    req.platform = platform;

    return next();
};

export const mapPermissions = (permissions: PermissionEntity[]) => {
    const valueToPermission = new Map<
        string,
        { id: number; description: string }
    >();

    for (const { id, values } of permissions) {
        // perm.values is an array of objects with a "value" property.

        values.forEach(({ value, description }) => {
            valueToPermission.set(value, {
                id,
                description,
            });
        });
    }

    return valueToPermission;
};

export const transformPermissions = (
    permissionMap: ReturnType<typeof mapPermissions>,
    rolePermissions: RoleEntity['permissions']
): {
    refinedPermission: RoleEntity['permissions'];
    invalidPermissions: string[];
} => {
    const invalidPermissions: string[] = [];

    const refinedPermission = rolePermissions
        .map((rolePerm) => {
            const value = rolePerm?.value ?? rolePerm;

            const permission = permissionMap.get(value);

            if (!permission?.id) {
                invalidPermissions.push(value);

                return null;
            }

            return {
                value,
                id: permission.id,
                description: permission.description,
            };
        })
        .filter(Boolean) as RoleEntity['permissions'];

    return { refinedPermission, invalidPermissions };
};

export const resolveRolePermissions = (
    permissions: PermissionEntity[],
    roles: RoleEntity[]
) => {
    const permissionMap = mapPermissions(permissions);

    // Map over the default roles to build a new rolesPermissions array with permission ids included.
    const transformedRoles = roles.map((role) => {
        const { name, userType, permissions: rolePermissions } = role;

        // Map each permission in the role to include its id (using the lookup).
        const { refinedPermission } = transformPermissions(
            permissionMap,
            rolePermissions
        );

        return {
            name,
            userType,
            permissions: refinedPermission,
        };
    });

    return transformedRoles;
};
