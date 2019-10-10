// main jest configuration file
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '../..');

module.exports = {
    rootDir: BASE_DIR,
    collectCoverage: true,
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'app/**.js',
        'app/**/*.js',
        'app/**/**/*.js'
    ],
    coverageReporters: [
        'clover',
        'text',
        'json',
        'json-summary',
        'lcov'
    ],
    reporters: [
        'default',
        [
            'jest-junit',
            {
                output: '<rootDir>/coverage/junit.xml'
            }
        ]
    ],
    testRunner: 'jest-circus/runner',
    testRegex: 'test/.*\\.js',
    testEnvironment: 'node',
    testPathIgnorePatterns: [
        '/node_modules/',
        'test/repo/query_builder/util.js',
        'test/util.js',
        'test/db_integration/util.js'
    ],
    moduleFileExtensions: [
        'js',
        'json'
    ]
};
