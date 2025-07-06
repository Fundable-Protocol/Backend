// import {
//     PermissionEntity,
//     RoleEntity,
// } from '../../components/v1/platform/platformEntities/permission.entity';
// import UserAccessEntity from '../../components/v1/platform/platformEntities/';
// import PlatformEntity, {
//     FreeDomainEntity,
// } from '../../components/v1/platform/platformEntities/platform.entity';
// import UserEntity from '../../components/v1/user/user.entity';
// import platformConstants from '../platformConstants';
// import { AppError } from '../../utils/errorHandler';
// import logger from '../../utils/logger';
// import appConfigs from '..';
// import platformRepository from '../../components/v1/platform/platformServices/platform.services';
// import { executeTransaction } from '../../utils';
// import {
//     defaultPermissions,
//     defaultRolesAndPermissions,
// } from '../defaultRolesAndPermissions';
// import { resolveRolePermissions } from '../../components/v1/platform/platform.utils';
// import { free_domains } from '../../utils/free_email';

// const initiateSeeding = async () => {
//     const { seedData, platformConfig } = appConfigs;
//     try {
//         logger.info('Check Seeding Data');

//         const platformExists = await platformRepository.findOneBy({
//             name: platformConfig.name,
//         });

//         if (platformExists) return;

//         logger.info('Initiating Seeding ⚙️');
//         logger.info('Seeding started ⚙️');

//         await executeTransaction(async (tx) => {
//             // Check if platform data exists

//             // Seed Platform
//             const platform = tx.create(PlatformEntity, {
//                 name: platformConfig.name!,
//                 version: '1.0.0',
//                 description: platformConfig?.description || '',
//                 userTypes:
//                     platformConstants.userTypes as unknown as PlatformEntity['userTypes'],
//                 supportedCountries:
//                     platformConstants.supportedCountries as unknown as PlatformEntity['supportedCountries'],

//                 setups: platformConstants.kycSteps.map((setup) => ({
//                     type: setup,
//                     status: 'active' as (typeof platformConstants.setupStatus)[number],
//                     activeCountries: [...platformConstants.supportedCountries],
//                     cost: 0,
//                 })),
//             });

//             logger.info('Seeding in progress (platform user done) ⚙️');

//             // Seed User
//             const user = tx.create(UserEntity, {
//                 phonePrefix: seedData.phonePrefix!,
//                 firstName: seedData.firstName!,
//                 lastName: seedData.lastName!,
//                 email: seedData.email!,
//                 phone: seedData.phone!,
//                 isConfirmed: true,
//                 countryCode: 'gh',
//                 isSignupComplete: true,
//                 userType: 'platform-admin',
//             });

//             await tx.save(user);

//             logger.info('Seeding in progress (seed user done) ⚙️');

//             const savedPermissions = await tx.save(
//                 PermissionEntity,
//                 defaultPermissions as unknown as PermissionEntity
//             );

//             const superAdminRole = tx.create(RoleEntity, {
//                 name: 'super-admin',
//                 permissions: [
//                     {
//                         value: 'supreme',
//                         description: 'one_star_general',
//                     },
//                 ],
//                 userType: 'platform-admin',
//             });

//             await tx.save(superAdminRole);

//             const resolvedRoles = resolveRolePermissions(
//                 savedPermissions as unknown as PermissionEntity[],
//                 defaultRolesAndPermissions as RoleEntity[]
//             );

//             await tx.save(RoleEntity, resolvedRoles as unknown as RoleEntity);

//             await tx.save(
//                 FreeDomainEntity,
//                 free_domains.map((domain) => ({ domain }))
//             );

//             // Seed Access

//             const userAccess = tx.create(UserAccessEntity, {
//                 userId: user.id,
//                 password: seedData.password!,
//                 Role: superAdminRole,
//             });

//             await tx.save([platform, userAccess]);
//         });

//         logger.info('Seeding in progress (seed access done) ⚙️');

//         logger.info('Seeding complete ✅');

//         return;
//     } catch (err) {
//         // logger.info('Error occurred in seeding:', err);

//         const error = err as Error;
//         throw new AppError({
//             name: error.name,
//             message: error.message,
//             httpCode: 500,
//         });
//     }
// };

// export default initiateSeeding;
