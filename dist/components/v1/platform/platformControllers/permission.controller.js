"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRole = exports.getRoles = exports.editRole = exports.addRole = exports.deletePermission = exports.getPermissions = exports.addPermissions = void 0;
const typeorm_1 = require("typeorm");
const helper_1 = require("../../../../utils/helper");
const errorHandler_1 = require("../../../../utils/errorHandler");
const role_services_1 = __importDefault(require("../platformServices/role.services"));
const utils_1 = require("../../../../utils");
const responseMessages_1 = __importDefault(require("../../../../utils/responseMessages"));
const permission_entity_1 = require("../platformEntities/permission.entity");
const platformConstants_1 = __importDefault(require("../../../../config/platformConstants"));
const data_source_1 = __importDefault(require("../../../../config/persistence/data-source"));
const platform_utils_1 = require("../platform.utils");
const permission_services_1 = __importDefault(require("../platformServices/permission.services"));
const addPermissions = async (req, res) => {
    const { permissions } = req.body;
    const permissionNames = permissions.map((perm) => perm.name);
    const permissionsExist = await permission_services_1.default.find({
        where: { name: (0, typeorm_1.In)(permissionNames) },
        select: { id: true },
    });
    if (permissionsExist?.length) {
        throw new errorHandler_1.ConflictError(responseMessages_1.default.permissionsExist);
    }
    await permission_services_1.default.insert(permissions);
    const savedPermissions = await permission_services_1.default.findBy({
        name: (0, typeorm_1.In)(permissionNames),
    });
    return (0, helper_1.handleResponse)(res, {
        message: responseMessages_1.default.fieldSuccessAction('Permission(s)', 'added'),
        data: savedPermissions,
    });
};
exports.addPermissions = addPermissions;
const getPermissions = async (req, res) => {
    const permissions = await permission_services_1.default.find();
    return (0, helper_1.handleResponse)(res, {
        data: permissions,
    });
};
exports.getPermissions = getPermissions;
const deletePermission = async (req, res) => {
    const { permissionId } = req.params;
    const permissionExist = await permission_services_1.default.findOne({
        where: { id: +permissionId },
    });
    if (!permissionExist) {
        throw new errorHandler_1.NotFoundError(responseMessages_1.default.dataNotExist('Permission(s)'));
    }
    const roleExist = await data_source_1.default.createQueryBuilder(permission_entity_1.RoleEntity, 'role')
        .where(`role.permissions @> :permissionFilter`, {
        permissionFilter: JSON.stringify([{ id: permissionExist.id }]),
    })
        .getOne();
    if (roleExist) {
        throw new errorHandler_1.InvalidRequestError('This permission caanot be deleted, it has an existing role.');
    }
    await permission_services_1.default.delete({ id: +permissionId });
    return (0, helper_1.handleResponse)(res, {
        message: responseMessages_1.default.fieldSuccessAction('Permission', 'deleted'),
        data: permissionExist,
    }, 204);
};
exports.deletePermission = deletePermission;
const addRole = async (req, res) => {
    const { permissions, name, userType } = req.body;
    const roleExist = await role_services_1.default.findOne({ where: { name } });
    if (roleExist) {
        throw new errorHandler_1.ConflictError(responseMessages_1.default.roleExists);
    }
    // Extract permission IDs from the request body
    const permissionIds = (0, utils_1.getUniqueNos)(permissions.map(({ id }) => id));
    // Find permissions in the database using the `find` method
    const existingPermissions = await permission_services_1.default.find({
        where: { id: (0, typeorm_1.In)(permissionIds) },
    });
    if (!existingPermissions.length) {
        throw new errorHandler_1.NotFoundError('Either permissions are invalid or does not exist.');
    }
    const permissionMap = (0, platform_utils_1.mapPermissions)(existingPermissions);
    const { invalidPermissions, refinedPermission } = (0, platform_utils_1.transformPermissions)(permissionMap, (0, utils_1.getUniqueIds)(permissions.map(({ value }) => value)));
    if (invalidPermissions.length > 0) {
        throw new errorHandler_1.BadRequestError(`Permission does not exist: ${invalidPermissions.join(', ')}`);
    }
    // // Create the new role
    const newRole = role_services_1.default.create({
        name,
        userType,
        permissions: refinedPermission,
    });
    // // Save the role to the database
    await role_services_1.default.save(newRole);
    return (0, helper_1.handleResponse)(res, {
        message: responseMessages_1.default.fieldSuccessAction('Role(s)', 'added'),
        data: newRole,
    });
};
exports.addRole = addRole;
const editRole = async (req, res) => {
    const { permissions, roleId } = req.body;
    const existingRole = await role_services_1.default.findOneBy({ id: roleId });
    if (!existingRole) {
        throw new errorHandler_1.ConflictError(responseMessages_1.default.roleNotExist);
    }
    // Extract permission IDs from the request body
    const permissionIds = (0, utils_1.getUniqueNos)(permissions.map(({ id }) => id));
    // Find permissions in the database using the `find` method
    const existingPermissions = await permission_services_1.default.find({
        where: { id: (0, typeorm_1.In)(permissionIds) },
    });
    if (!existingPermissions.length) {
        throw new errorHandler_1.NotFoundError('Either permissions are invalid or does not exist.');
    }
    const permissionMap = (0, platform_utils_1.mapPermissions)(existingPermissions);
    const { invalidPermissions, refinedPermission } = (0, platform_utils_1.transformPermissions)(permissionMap, (0, utils_1.getUniqueIds)(permissions.map(({ value }) => value)));
    if (invalidPermissions.length > 0) {
        throw new errorHandler_1.BadRequestError(`Permission does not exist: ${invalidPermissions.join(', ')}`);
    }
    //if all goes well, add permissions to role
    existingRole.permissions = refinedPermission;
    await role_services_1.default.save(existingRole);
    return (0, helper_1.handleResponse)(res, {
        message: responseMessages_1.default.fieldSuccessAction('Role(s)', 'updated'),
        data: existingRole,
    });
};
exports.editRole = editRole;
const superAdminRole = platformConstants_1.default.platformRoleTypes[0];
const getRoles = async (req, res) => {
    const excludedFields = [superAdminRole, req.role?.name];
    const roles = await role_services_1.default.findBy({
        name: (0, typeorm_1.Not)((0, typeorm_1.In)(excludedFields)),
    });
    return (0, helper_1.handleResponse)(res, {
        data: roles,
    });
};
exports.getRoles = getRoles;
const deleteRole = async (req, res) => {
    const { roleId } = req.params;
    const roleExist = await role_services_1.default.findOne({
        where: { id: +roleId, name: (0, typeorm_1.Not)(superAdminRole) },
    });
    if (!roleExist) {
        throw new errorHandler_1.NotFoundError(responseMessages_1.default.dataNotExist('Role'));
    }
    await role_services_1.default.delete({ id: +roleId });
    return (0, helper_1.handleResponse)(res, {
        message: responseMessages_1.default.fieldSuccessAction('Role', 'deleted'),
        data: null,
    });
};
exports.deleteRole = deleteRole;
