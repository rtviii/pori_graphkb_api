module.exports = {
    common: {
        GKB_DISABLE_AUTH: false,
        GKB_DBS_USER: 'root',
        GKB_DB_CREATE: true,
        GKB_DB_HOST: 'orientdbdev.bcgsc.ca',
        GKB_DB_MIGRATE: true,
        GKB_DB_PASS: 'admin',
        GKB_DB_PORT: 2427,
        GKB_DB_USER: 'admin',
        GKB_DB_POOL: 25,
        GKB_KEYCLOAK_CLIENT_ID: 'GraphKB',
        GKB_KEYCLOAK_ROLE: 'GraphKB',
        GKB_KEYCLOAK_URI: 'http://keycloakdev01.bcgsc.ca/auth/realms/GSC_posix_syncd/protocol/openid-connect/token',
        GKB_KEYCLOAK_KEY_FILE: 'config/keys/keycloak-dev.key',
        GKB_KEY_FILE: 'id_rsa',
        GKB_LOG_DIR: 'logs',
        GKB_LOG_LEVEL: 'debug',
        GKB_PORT: 8080,
        GKB_USER_CREATE: true,
        GKB_CORS_ORIGIN: '*',
        GKB_HOST: process.env.HOSTNAME
    },
    development: {
        GKB_DB_CREATE: false,
        GKB_LOG_MAX_FILES: 7,
        GKB_DB_NAME: 'next-production',
        GKB_CORS_ORIGIN: 'https://graphkbdev.bcgsc.ca http://localhost:3000'
    },
    local: {
        GKB_CORS_ORIGIN: 'http://localhost:3000'
    },
    production: {
        GKB_DB_CREATE: false,
        GKB_DB_HOST: 'orientdbdev.bcgsc.ca',
        GKB_DB_NAME: 'development',
        GKB_DB_PORT: 2427,
        GKB_KEYCLOAK_KEY_FILE: 'config/keys/keycloak.key',
        GKB_KEYCLOAK_URI: 'https://keycloak.bcgsc.ca/auth/realms/GSC/protocol/openid-connect/token',
        GKB_LOG_LEVEL: 'info',
        GKB_LOG_MAX_FILES: 28,
        GKB_CORS_ORIGIN: 'https://graphkb.bcgsc.ca'
    },
    test: {
        GKB_DISABLE_AUTH: true,
        GKB_LOG_LEVEL: 'error'
    }
};
