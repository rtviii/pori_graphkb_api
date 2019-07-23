/**
 * This module will contain migrations that are determined by the content of the SchemaHistory table
 */

const {RID} = require('orientjs');
const semver = require('semver');

const {constants, schema: {schema: SCHEMA_DEFN}, util: {timeStampNow}} = require('@bcgsc/knowledgebase-schema');

constants.RID = RID; // IMPORTANT: Without this all castToRID will do is convert to a string

const {logger} = require('./../logging');
const {Property, ClassModel} = require('../model');

const _version = require('./version');

/**
 * Checks if the current version is more than a patch change
 *
 * @param {string} currentVersion the version last installed in the db instance (schema history table)
 * @param {string} targetVersion the version of the currently installed node package (node_modules)
 *
 * @returns {boolean} true when more than a patch level change between the versions
 */
const requiresMigration = (currentVersion, targetVersion) => {
    const compatibleVersion = `~${targetVersion.replace(/\.[^.]+$/, '')}`;
    return !semver.satisfies(currentVersion, compatibleVersion);
};

/**
 * Migrate any 1.6.X database to any 1.7.X database
 *
 * @param {orientjs.Db} db the database connection
 */
const migrate16Xto17X = async (db) => {
    logger.info('Indexing Variant.type');
    await db.index.create(
        SCHEMA_DEFN.Variant.indices.find(item => item.name === 'Variant.type')
    );
    logger.info('Indexing Statement.relevance');
    await db.index.create(
        SCHEMA_DEFN.Statement.indices.find(item => item.name === 'Statement.relevance')
    );
    logger.info('Indexing Statement.appliesTo');
    await db.index.create(
        SCHEMA_DEFN.Statement.indices.find(item => item.name === 'Statement.appliesTo')
    );
};


/**
 * Migrate any 1.7.X database to any 1.8.X database
 *
 * @param {orientjs.Db} db the database connection
 */
const migrate17Xto18X = async (db) => {
    logger.info('Add evidence level to Statement');
    const {evidenceLevel} = SCHEMA_DEFN.Statement.properties;
    const dbClass = await db.class.get(SCHEMA_DEFN.Statement.name);
    await Property.create(evidenceLevel, dbClass);
};


/**
 * Migrate any 1.8.X database to any 1.9.X database
 *
 * @param {orientjs.Db} db the database connection
 */
const migrate18Xto19X = async (db) => {
    logger.info('Convert Evidence to an abstract class (slow, please wait)');
    await db.command('ALTER CLASS Evidence SUPERCLASS -Ontology').all();
    await db.command('DROP CLASS EvidenceGroup').all();
    await db.command('DROP PROPERTY Permissions.EvidenceGroup').all();
    logger.info('Update the existing usergroup permission schemes: remove Permissions.EvidenceGroup');
    await db.command('UPDATE UserGroup REMOVE permissions.EvidenceGroup').all();


    for (const subclass of ['EvidenceLevel', 'ClinicalTrial', 'Publication']) {
        logger.info(`Remove Evidence as parent from ${subclass}`);
        await db.command(`ALTER CLASS ${subclass} SUPERCLASS -Evidence`).all();
        logger.info(`Add Ontology as parent to ${subclass}`);
        await db.command(`ALTER CLASS ${subclass} SUPERCLASS +Ontology`).all();
    }
    logger.info('make evidence abstract');
    await db.command('ALTER CLASS Evidence ABSTRACT TRUE').all();
    await db.command('UPDATE UserGroup set permissions.Evidence = 4 where permissions.Evidence > 4').all();

    logger.info('Re-add Evidence as abstract parent');
    for (const subclass of ['EvidenceLevel', 'ClinicalTrial', 'Publication', 'Source']) {
        logger.info(`Add Evidence as parent of ${subclass} (slow, please wait)`);
        await db.command(`ALTER CLASS ${subclass} SUPERCLASS +Evidence`).all();
    }


    logger.info('Add actionType property to class TargetOf');
    const {actionType} = SCHEMA_DEFN.TargetOf.properties;
    const targetof = await db.class.get(SCHEMA_DEFN.TargetOf.name);
    await Property.create(actionType, targetof);

    logger.info('Create the CuratedContent class');
    await ClassModel.create(SCHEMA_DEFN.CuratedContent, db);
    await db.command('CREATE PROPERTY Permissions.CuratedContent INTEGER (NOTNULL TRUE, MIN 0, MAX 15)').all();
    logger.info('Update the existing usergroup permission schemes: add Permissions.CuratedContent');
    await db.command('UPDATE UserGroup SET permissions.CuratedContent = 0').all();
    await db.command('UPDATE UserGroup SET permissions.CuratedContent = 15 where name = \'admin\' or name = \'regular\'').all();
    await db.command('UPDATE UserGroup SET permissions.CuratedContent = 4 where name = \'readonly\'').all();

    logger.info('Add addition Source properties');
    const source = await db.class.get(SCHEMA_DEFN.Source.name);
    const {license, licenseType, citation} = SCHEMA_DEFN.Source.properties;
    await Promise.all([license, licenseType, citation].map(prop => Property.create(prop, source)));
};

/**
 * Migrate from 2.0.X to 2.1.0
 */
const migrate2from0xto1x = async (db) => {
    // set Biomarker as a superclass of Vocabulary
    await db.command('ALTER CLASS Vocabulary SUPERCLASS +Biomarker').all();
    // rename reviewStatus to status on the StatementReview class
    await db.command('ALTER PROPERTY StatementReview.reviewStatus NAME "status"').all();
    // alter the statement class to allow appliesTo to be a biomarker
    await db.command('ALTER PROPERTY Statement.appliesTo LINKEDCLASS Biomarker').all();
};


const logMigration = async (db, name, url, version) => {
    const schemaHistory = await db.class.get('SchemaHistory');
    await schemaHistory.create({
        version,
        name,
        url,
        createdAt: timeStampNow()
    });
    return version;
};


/**
 * Detects the current version of the db, the version of the node module and attempts
 * to migrate from one to the other
 *
 * @param {orientjs.Db} db the database connection
 */
const migrate = async (db, opt = {}) => {
    const {checkOnly = false} = opt;
    const currentVersion = await _version.getCurrentVersion(db);
    const {version: targetVersion, name, url} = _version.getLoadVersion();

    if (!requiresMigration(currentVersion, targetVersion)) {
        logger.info(`Versions (${currentVersion}, ${targetVersion}) are compatible and do not require migration`);
        return;
    } if (checkOnly) {
        throw new Error(`Versions (${currentVersion}, ${targetVersion}) are not compatible and require migration`);
    }

    let migratedVersion = currentVersion;

    while (requiresMigration(migratedVersion, targetVersion)) {
        if (semver.satisfies(migratedVersion, '>=1.6.2 <1.7.0')) {
            logger.info(`Migrating from 1.6.X series (${currentVersion}) to v1.7.X series (${targetVersion})`);
            await migrate16Xto17X(db);
            migratedVersion = await logMigration(db, name, url, '1.7.0');
        } else if (semver.satisfies(migratedVersion, '>=1.7.0 <1.8.0')) {
            logger.info(`Migrating from 1.7.X series (${currentVersion}) to v1.8.X series (${targetVersion})`);
            await migrate17Xto18X(db);
            migratedVersion = await logMigration(db, name, url, '1.8.0');
        } else if (semver.satisfies(migratedVersion, '>=1.8.0 <1.9.0')) {
            logger.info(`Migrating from 1.8.X series (${currentVersion}) to v1.9.X series (${targetVersion})`);
            await migrate18Xto19X(db);
            migratedVersion = await logMigration(db, name, url, '1.9.0');
        } else if (semver.satisfies(migratedVersion, '>=2.0.0 <2.1.0')) {
            logger.info(`Migrating from 2.0.X series (${currentVersion}) to v2.1.X series (${targetVersion})`);
            await migrate2from0xto1x(db);
            migratedVersion = await logMigration(db, name, url, '2.1.0');
        } else {
            throw new Error(`Unable to find migration scripts from ${migratedVersion} to ${targetVersion}`);
        }
    }

    // update the schema history table
    if (targetVersion !== migratedVersion) {
        await logMigration(db, name, url, targetVersion);
    }
};

module.exports = {
    migrate, requiresMigration
};
