
const HTTP_STATUS = require('http-status-codes');
const jc = require('json-cycle');

const {error: {AttributeError}, schema: {schema}} = require('@bcgsc/knowledgebase-schema');
const {variant: {parse: variantParser}, error: {ParsingError}} = require('@bcgsc/knowledgebase-parser');

const openapi = require('./openapi');
const resource = require('./resource');
const {logger} = require('./../repo/logging');
const {
    MIN_WORD_SIZE, checkStandardOptions
} = require('./query');
const {selectByKeyword, selectFromList, selectCounts} = require('../repo/commands');
const {addErrorRoute} = require('./error');

/**
 * @param {AppServer} app the GraphKB app server
 */
const addKeywordSearchRoute = (app) => {
    logger.log('verbose', 'NEW ROUTE [GET] /statements/search');

    app.router.get('/statements/search',
        async (req, res, next) => {
            const {
                keyword
            } = req.query;

            const options = {user: req.user};
            try {
                Object.assign(options, checkStandardOptions(req.query));
            } catch (err) {
                return next(err);
            }
            if (keyword === undefined) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: 'keyword query parameter is required'
                });
            }
            const wordList = keyword.split(/\s+/);

            if (wordList.some(word => word.length < MIN_WORD_SIZE)) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json(new AttributeError(
                    `Word "${keyword}" is too short to query with ~ operator. Must be at least ${
                        MIN_WORD_SIZE
                    } letters after splitting on whitespace characters`
                ));
            }
            let session;
            try {
                session = await app.pool.acquire();
            } catch (err) {
                return next(err);
            }
            try {
                const result = await selectByKeyword(session, wordList, options);
                session.close();
                return res.json(jc.decycle({result}));
            } catch (err) {
                session.close();
                return next(err);
            }
        });
};

/**
 * @param {AppServer} app the GraphKB app server
 */
const addGetRecordsByList = (app) => {
    app.router.get('/records',
        async (req, res, next) => {
            let options;
            try {
                options = {...checkStandardOptions(req.query), user: req.user};
            } catch (err) {
                return next(err);
            }

            const {
                rid = '', activeOnly, neighbors, user, ...rest
            } = options;
            if (Object.keys(rest).length) {
                return next(new AttributeError({
                    message: `Invalid query parameter(s) (${Object.keys(rest).join(', ')})`,
                    invalidParams: rest
                }));
            }
            let session;
            try {
                session = await app.pool.acquire();
            } catch (err) {
                return next(err);
            }
            try {
                const result = await selectFromList(session, rid.split(',').map(r => r.trim()), options);
                session.close();
                return res.json(jc.decycle({result}));
            } catch (err) {
                session.close();
                return next(err);
            }
        });
};


const addStatsRoute = (app) => {
    // add the stats route
    const classList = Object.keys(schema).filter(
        name => !schema[name].isAbstract
            && schema[name].subclasses.length === 0 // terminal classes only
            && !schema[name].embedded
    );
    app.router.get('/stats', async (req, res, next) => {
        let session;
        try {
            session = await app.pool.acquire();
        } catch (err) {
            return next(err);
        }
        try {
            const {groupBySource = false, activeOnly = true} = checkStandardOptions(req.query);
            const stats = await selectCounts(session, {groupBySource, activeOnly, classList});
            session.close();
            return res.status(HTTP_STATUS.OK).json(jc.decycle({result: stats}));
        } catch (err) {
            session.close();
            return next(err);
        }
    });
};


const addParserRoute = (app) => {
    logger.info('NEW ROUTE [POST] /parse');
    app.router.post('/parse', async (req, res, next) => {
        if (!req.body || !req.body.content) {
            return next(new AttributeError('body.content is a required input'));
        }
        const {content, requireFeatures = true} = req.body;
        try {
            const parsed = variantParser(content, requireFeatures);
            return res.status(HTTP_STATUS.OK).json({result: parsed});
        } catch (err) {
            if (err instanceof ParsingError) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json(jc.decycle(err));
            }
            return next(err);
        }
    });
};


module.exports = {
    openapi, resource, addKeywordSearchRoute, addGetRecordsByList, addStatsRoute, addParserRoute, addErrorRoute
};
