

/**
 * Contains all functions for directly interacting with the database
 */
/**
 * @ignore
 */
const {schema: {schema}} = require('@bcgsc/knowledgebase-schema');
const {variant: {VariantNotation}} = require('@bcgsc/knowledgebase-parser');

const {logger} = require('../logging');
const {parse} = require('../query_builder');
const {
    MultipleRecordsFoundError,
    NoRecordFoundError
} = require('../error');
const {trimRecords} = require('../util');
const {wrapIfTypeError} = require('./util');


const RELATED_NODE_DEPTH = 3;
const QUERY_LIMIT = 1000;


/**
 * @param {orientjs.Db} db the database connection object
 * @param {Object} opt
 * @param {Array.<string>} opt.classList list of classes to gather stats for. Defaults to all
 * @param {Boolean} [opt.=true] ignore deleted records
 * @param {Boolean} [opt.groupBySource=false] group by class and source instead of class only
 */
const selectCounts = async (db, opt = {}) => {
    const {
        groupBySource = false,
        history = false,
        classList = Object.keys(schema)
    } = opt;

    const tempCounts = await Promise.all(classList.map(
        async (cls) => {
            let statement;
            if (!groupBySource) {
                statement = `SELECT count(*) as cnt FROM ${cls}`;
                if (!history) {
                    statement = `${statement} WHERE deletedAt IS NULL`;
                }
            } else if (!history) {
                statement = `SELECT source, count(*) as cnt FROM ${cls} WHERE deletedAt IS NULL GROUP BY source`;
            } else {
                statement = `SELECT source, count(*) as cnt FROM ${cls} GROUP BY source`;
            }
            logger.log('debug', statement);
            return db.query(statement).all();
        }
    ));
    const counts = {};
    // nest counts into objects based on the grouping keys
    for (let i = 0; i < classList.length; i++) {
        const name = classList[i];
        counts[name] = {};
        for (const record of tempCounts[i]) {
            if (groupBySource) {
                counts[name][record.source || null] = record.cnt;
            } else {
                counts[name] = record.cnt;
            }
        }
    }
    return counts;
};


/**
 * Given a user name return the active record. Groups will be returned in full so that table level
 * permissions can be checked
 *
 * @param {orientjs.Db} db the orientjs database connection object
 * @param {string} username the name of the user to select
 */
const getUserByName = async (db, username) => {
    logger.debug(`getUserByName: ${username}`);
    // raw SQL to avoid having to load db models in the middleware
    let user;
    try {
        user = await db.query(
            'SELECT *, groups:{*, @rid, @class} from User where name = :param0 AND deletedAt IS NULL',
            {
                params: {param0: username}
            }
        ).all();
    } catch (err) {
        throw wrapIfTypeError(err);
    }
    if (user.length > 1) {
        logger.error(`selected multiple users: ${user.map(r => r['@rid']).join(', ')}`);
        throw new MultipleRecordsFoundError(`username (${username}) is not unique and returned multiple (${user.length}) records`);
    } else if (user.length === 0) {
        throw new NoRecordFoundError(`no user found for the username '${username}'`);
    } else {
        return user[0];
    }
};


/**
 * Builds the query statement for selecting or matching records from the database
 *
 * @param {orientjs.Db} db Database connection from orientjs
 * @param {Query} query the query object
 *
 * @param {Object} opt Selection options
 * @param {?number} [opt.exactlyN=null] if not null, check that the returned record list is the same length as this value
 * @param {User} [opt.user] the current user
 * @param {string} [opt.fetchPlan] overrides the default fetch plan created from the neighbors
 *
 * @todo Add support for permissions base-d fetch plans
 *
 * @returns {Array.<Object>} array of database records
 */
const select = async (db, query, opt = {}) => {
    // set the default options
    const {exactlyN = null, user} = opt;
    logger.log('debug', query.displayString());

    // send the query statement to the database
    const {params, query: statement} = query.toString
        ? query.toString()
        : query;

    const queryOpt = {
        params
    };
    logger.log('debug', JSON.stringify(queryOpt));

    let recordList;

    try {
        recordList = await db.query(`${statement}`, queryOpt).all();
    } catch (err) {
        logger.log('debug', `Error in executing the query statement (${statement})`);
        logger.log('debug', err);
        const error = wrapIfTypeError({...err, sql: statement});
        console.error(error);
        throw error;
    }

    logger.log('debug', `selected ${recordList.length} records`);

    recordList = await trimRecords(recordList, {history: query.history, user, db});

    if (exactlyN !== null) {
        if (recordList.length < exactlyN) {
            throw new NoRecordFoundError({
                message: `query expected ${exactlyN} records but only found ${recordList.length}`,
                sql: query.displayString()
            });
        } else if (exactlyN !== recordList.length) {
            throw new MultipleRecordsFoundError({
                message: `query returned unexpected number of results. Found ${recordList.length} results but expected ${exactlyN} results`,
                sql: query.displayString()
            });
        } else {
            return recordList;
        }
    } else {
        return recordList;
    }
};

/**
 * Calculate the display name when it requires a db connection to resolve linked records
 */
const fetchDisplayName = async (db, model, content) => {
    if (model.inherits.includes('Variant')) {
        const links = [content.type, content.reference1];
        if (content.reference2) {
            links.push(content.reference2);
        }
        const query = parse({
            target: links,
            returnProperties: ['displayName']
        });
        const [type, reference1, reference2] = (await select(
            db,
            query
        ).map(rec => rec.displayName));

        if (model.name === 'CategoryVariant') {
            if (reference2) {
                return `${reference1} and ${reference2} ${type}`;
            }
            return `${reference1} ${type}`;
        } if (model.name === 'PositionalVariant') {
            const obj = {
                ...content, multiFeature: Boolean(reference2), reference1, reference2, type
            };
            const notation = VariantNotation.toString(obj);
            return notation;
        }
    } if (model.name === 'Statement') {
        return null;
    }
    return content.name;
};


module.exports = {
    getUserByName,
    QUERY_LIMIT,
    RELATED_NODE_DEPTH,
    select,
    selectCounts,
    fetchDisplayName
};
