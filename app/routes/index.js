
const HTTP_STATUS = require('http-status-codes');
const jc = require('json-cycle');

const {error: {AttributeError}} = require('@bcgsc/knowledgebase-schema');

const openapi = require('./openapi');
const util = require('./util');
const {logger} = require('./../repo/logging');
const {
    castRangeInt, MAX_LIMIT, MAX_JUMPS, MIN_WORD_SIZE
} = require('./query');
const {selectByKeyword} = require('../repo/base');


const addKeywordSearchRoute = (opt) => {
    const {
        router, db
    } = opt;
    logger.log('verbose', 'NEW ROUTE [GET] /search');

    router.get('/search',
        async (req, res) => {
            const {
                keyword, neighbors, limit, ...other
            } = req.query;

            const options = {user: req.user};
            try {
                if (limit !== undefined) {
                    options.limit = castRangeInt(limit, 1, MAX_LIMIT);
                } else if (neighbors !== undefined) {
                    options.neighbors = castRangeInt(neighbors, 0, MAX_JUMPS);
                }
            } catch (err) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json(err);
            }

            if (Object.keys(other).length) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: 'Invalid query parameter',
                    invalidParams: other
                });
            }
            if (keyword === undefined) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: 'keyword query parameter is required'
                });
            }
            const wordList = keyword.split(/\s+/);

            if (wordList.some(word => word.length < MIN_WORD_SIZE)) {
                res.status(HTTP_STATUS.BAD_REQUEST).json(new AttributeError(
                    `Word "${keyword}" is too short to query with ~ operator. Must be at least ${
                        MIN_WORD_SIZE
                    } letters after splitting on whitespace characters`
                ));
            }
            try {
                const result = await selectByKeyword(db, wordList, options);
                return res.json(jc.decycle({result}));
            } catch (err) {
                logger.log('debug', err);
                if (err instanceof AttributeError) {
                    return res.status(HTTP_STATUS.BAD_REQUEST).json(err);
                }
                logger.log('error', err);
                return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(err);
            }
        });
};

module.exports = {openapi, util, addKeywordSearchRoute};
