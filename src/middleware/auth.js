/**
 * Module resposible for authentication and authroization related middleware functions
 */
/**
 * @ignore
 */
const HTTP_STATUS = require('http-status-codes');
const jwt = require('jsonwebtoken');

const { constants: { PERMISSIONS } } = require('@bcgsc/knowledgebase-schema');

const { PermissionError } = require('./../repo/error');
const { logger } = require('./../repo/logging');


/*
 * checks that the kbToken is valid/active
 */
const checkToken = privateKey => async (req, res, next) => {
    if (req.method === 'OPTIONS') {
        return next();
    }
    const token = req.header('Authorization');

    if (token === undefined) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'did not find authorized token', name: 'PermissionError' });
    }

    try {
        const decoded = jwt.verify(token, privateKey);
        req.user = decoded.user; // eslint-disable-line no-param-reassign
        return next();
    } catch (err) {
        logger.log('debug', err);
        return res.status(HTTP_STATUS.UNAUTHORIZED).json(err);
    }
};

/**
 * Check that the user has permissions for the intended operation on a given route
 * Note that to do this, model and user need to already be assigned to the request
 */
const checkClassPermissions = async (req, res, next) => {
    const { model, user } = req;
    const operation = req.method;

    const mapping = {
        GET: PERMISSIONS.READ,
        UPDATE: PERMISSIONS.UPDATE,
        DELETE: PERMISSIONS.DELETE,
        POST: PERMISSIONS.CREATE,
        PATCH: PERMISSIONS.UPDATE,
    };
    const operationPermission = mapping[operation];

    for (const group of user.groups) {
        // Default to no permissions
        const groupPermission = group.permissions[model.name] === undefined
            ? PERMISSIONS.NONE
            : group.permissions[model.name];

        if (operationPermission & groupPermission) {
            return next();
        }
    }
    return res.status(HTTP_STATUS.FORBIDDEN).json(new PermissionError(
        `The user ${user.name} does not have sufficient permissions to perform a ${operation} operation on class ${model.name}`,
    ));
};

module.exports = {
    checkToken, checkClassPermissions,
};
