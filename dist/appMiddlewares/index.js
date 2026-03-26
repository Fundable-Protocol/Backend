"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAllowedMethods = void 0;
const verifyAllowedMethods = (req, res, next) => {
    try {
        if (req.method === 'OPTIONS') {
            res.header('Access-Control-Allow-Methods', 'POST, PUT, PATCH, GET, DELETE');
            return res.sendStatus(204);
        }
        else
            return next();
    }
    catch (err) {
        return next(err);
    }
};
exports.verifyAllowedMethods = verifyAllowedMethods;
