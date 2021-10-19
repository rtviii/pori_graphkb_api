// All settings in this file are overloadable via environment variables at runtime
module.exports = {
    common: {
        GKB_BASE_PATH: '',
        GKB_CORS_ORIGIN: '^.*$',
        GKB_DBS_USER: 'root',
        GKB_DB_CREATE: true,
        GKB_DB_HOST: 'orientdbdev.bcgsc.ca',
        GKB_DB_MIGRATE: true,
        GKB_DBS_PASS: 'Kn0wl3dgeb4s3',
        GKB_DB_PASS: 'admin',
        GKB_DB_POOL: 25,
        GKB_DB_PORT: 2424,
        GKB_DB_USER: 'admin',
        GKB_DISABLE_AUTH: false,
        GKB_KEYCLOAK_CLIENT_ID: 'GraphKB',
        GKB_KEYCLOAK_KEY_FILE: 'config/keys/keycloak-dev.key',
        GKB_KEYCLOAK_ROLE: 'GraphKB',
        GKB_KEYCLOAK_URI: 'http://keycloakdev.bcgsc.ca/auth/realms/GSC/protocol/openid-connect/token',
        GKB_KEY_FILE: 'id_rsa',
        GKB_LOG_LEVEL: 'debug',
        GKB_PORT: 8080,
        GKB_USER_CREATE: true,
    },
    development: {
        GKB_DB_CREATE: true,
        GKB_DB_NAME: 'akushner-test',
    },
    local: {
        GKB_CORS_ORIGIN: '^.*$',
    },
    production: {
        GKB_CORS_ORIGIN: 'https://graphkb.bcgsc.ca',
        GKB_DB_CREATE: false,
        GKB_DB_HOST: 'orientdb.bcgsc.ca',
        GKB_DB_NAME: 'production',
        GKB_KEYCLOAK_KEY_FILE: 'config/keys/keycloak.key',
        GKB_KEYCLOAK_URI: 'https://sso.bcgsc.ca/auth/realms/GSC/protocol/openid-connect/token',
        GKB_LOG_LEVEL: 'info',
    },
    staging: {
        GKB_CORS_ORIGIN: 'https://graphkbstaging.bcgsc.ca',
        GKB_DB_CREATE: false,
        GKB_DB_NAME: 'production-sync-staging',
        GKB_KEYCLOAK_KEY_FILE: 'config/keys/keycloak-dev.key',
    },
    test: {
        GKB_DISABLE_AUTH: true,
        GKB_LOG_LEVEL: 'error',
    },
};
