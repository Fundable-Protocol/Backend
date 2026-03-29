import { z } from 'zod';
import { In, Not } from 'typeorm';
import { Response } from 'express';

import { IRequest } from '../../../../types/global';
import { handleResponse } from '../../../../utils/helper';
import {
    addPermissionSchema,
    addRoleSchema,
    editdRoleSchema,
} from '../platform.validations';

import {
    BadRequestError,
    ConflictError,
    InvalidRequestError,
    NotFoundError,
} from '../../../../utils/errorHandler';

import roleRepository from '../platformServices/role.services';
import { getUniqueIds, getUniqueNos } from '../../../../utils';
import responseMessages from '../../../../utils/responseMessages';
import { RoleEntity } from '../platformEntities/permission.entity';
import platformConstants from '../../../../config/platformConstants';
import AppDataSource from '../../../../config/persistence/data-source';
import { mapPermissions, transformPermissions } from '../platform.utils';
import permissionRepository from '../platformServices/permission.services';

export const addPermissions = async (req: IRequest, res: Response) => {
    const { permissions }: z.infer<typeof addPermissionSchema> = req.body;

    const permissionNames = permissions.map((perm) => perm.name);

    const permissionsExist = await permissionRepository.find({
        where: { name: In(permissionNames) },
        select: { id: true },
    });

    if (permissionsExist?.length) {
        throw new ConflictError(responseMessages.permissionsExist);
    }

    await permissionRepository.insert(permissions);

    const savedPermissions = await permissionRepository.findBy({
        name: In(permissionNames),
    });

    return handleResponse(res, {
        message: responseMessages.fieldSuccessAction('Permission(s)', 'added'),
        data: savedPermissions,
    });
};

export const getPermissions = async (req: IRequest, res: Response) => {
    const permissions = await permissionRepository.find();

    return handleResponse(res, {
        data: permissions,
    });
};

export const deletePermission = async (req: IRequest, res: Response) => {
    const { permissionId } = req.params;

    const permissionExist = await permissionRepository.findOne({
        where: { id: +permissionId },
    });

    if (!permissionExist) {
        throw new NotFoundError(responseMessages.dataNotExist('Permission(s)'));
    }

    const roleExist = await AppDataSource.createQueryBuilder(RoleEntity, 'role')
        .where(`role.permissions @> :permissionFilter`, {
            permissionFilter: JSON.stringify([{ id: permissionExist.id }]),
        })
        .getOne();

    if (roleExist) {
        throw new InvalidRequestError(
            'This permission caanot be deleted, it has an existing role.'
        );
    }

    await permissionRepository.delete({ id: +permissionId });

    return handleResponse(
        res,
        {
            message: responseMessages.fieldSuccessAction(
                'Permission',
                'deleted'
            ),
            data: permissionExist,
        },
        204
    );
};

export const addRole = async (req: IRequest, res: Response) => {
    const { permissions, name, userType }: z.infer<typeof addRoleSchema> =
        req.body;

    const roleExist = await roleRepository.findOne({ where: { name } });

    if (roleExist) {
        throw new ConflictError(responseMessages.roleExists);
    }

    // Extract permission IDs from the request body
    const permissionIds = getUniqueNos(permissions.map(({ id }) => id));

    // Find permissions in the database using the `find` method
    const existingPermissions = await permissionRepository.find({
        where: { id: In(permissionIds) },
    });

    if (!existingPermissions.length) {
        throw new NotFoundError(
            'Either permissions are invalid or does not exist.'
        );
    }

    const permissionMap = mapPermissions(existingPermissions);

    const { invalidPermissions, refinedPermission } = transformPermissions(
        permissionMap,
        getUniqueIds(
            permissions.map(({ value }) => value)
        ) as unknown as RoleEntity['permissions']
    );

    if (invalidPermissions.length > 0) {
        throw new BadRequestError(
            `Permission does not exist: ${invalidPermissions.join(', ')}`
        );
    }

    // // Create the new role
    const newRole = roleRepository.create({
        name,
        userType,
        permissions: refinedPermission,
    });

    // // Save the role to the database
    await roleRepository.save(newRole);

    return handleResponse(res, {
        message: responseMessages.fieldSuccessAction('Role(s)', 'added'),
        data: newRole,
    });
};

export const editRole = async (req: IRequest, res: Response) => {
    const { permissions, roleId }: z.infer<typeof editdRoleSchema> = req.body;

    const existingRole = await roleRepository.findOneBy({ id: roleId });

    if (!existingRole) {
        throw new ConflictError(responseMessages.roleNotExist);
    }

    // Extract permission IDs from the request body
    const permissionIds = getUniqueNos(permissions.map(({ id }) => id));

    // Find permissions in the database using the `find` method
    const existingPermissions = await permissionRepository.find({
        where: { id: In(permissionIds) },
    });

    if (!existingPermissions.length) {
        throw new NotFoundError(
            'Either permissions are invalid or does not exist.'
        );
    }

    const permissionMap = mapPermissions(existingPermissions);

    const { invalidPermissions, refinedPermission } = transformPermissions(
        permissionMap,
        getUniqueIds(
            permissions.map(({ value }) => value)
        ) as unknown as RoleEntity['permissions']
    );

    if (invalidPermissions.length > 0) {
        throw new BadRequestError(
            `Permission does not exist: ${invalidPermissions.join(', ')}`
        );
    }

    //if all goes well, add permissions to role
    existingRole.permissions = refinedPermission;

    await roleRepository.save(existingRole);

    return handleResponse(res, {
        message: responseMessages.fieldSuccessAction('Role(s)', 'updated'),
        data: existingRole,
    });
};

const superAdminRole = platformConstants.platformRoleTypes[0];
export const getRoles = async (req: IRequest, res: Response) => {
    const excludedFields = [superAdminRole, req.role?.name];

    const roles = await roleRepository.findBy({
        name: Not(In(excludedFields)),
    });

    return handleResponse(res, {
        data: roles,
    });
};

export const deleteRole = async (req: IRequest, res: Response) => {
    const { roleId } = req.params;

    const roleExist = await roleRepository.findOne({
        where: { id: +roleId, name: Not(superAdminRole) },
    });

    if (!roleExist) {
        throw new NotFoundError(responseMessages.dataNotExist('Role'));
    }

    await roleRepository.delete({ id: +roleId });

    return handleResponse(res, {
        message: responseMessages.fieldSuccessAction('Role', 'deleted'),
        data: null,
    });
};
