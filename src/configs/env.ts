/** This module handles settings taken from environment variables */

/** The website name */
export const WEBSITE_NAME = process.env.REACT_APP_WEBSITE_NAME || 'OpenSRP';
export type WEBSITE_NAME = typeof WEBSITE_NAME;

/** The domain name */
export const DOMAIN_NAME = process.env.REACT_APP_DOMAIN_NAME || 'http://localhost:3000';
export type DOMAIN_NAME = typeof DOMAIN_NAME;

/** Do you want to enable the users page? */
export const ENABLE_USERS = process.env.REACT_APP_ENABLE_USERS === 'true';
export type ENABLE_USERS = typeof ENABLE_USERS;

/** Do you want to enable the about page? */
export const ENABLE_ABOUT = process.env.REACT_APP_ENABLE_ABOUT === 'true';
export type ENABLE_ABOUT = typeof ENABLE_ABOUT;

/** Do you want to disable login protection? */
export const DISABLE_LOGIN_PROTECTION = process.env.REACT_APP_DISABLE_LOGIN_PROTECTION === 'true';
export type DISABLE_LOGIN_PROTECTION = typeof DISABLE_LOGIN_PROTECTION;

/** The Superset API base */
export const SUPERSET_API_BASE = process.env.REACT_APP_SUPERSET_API_BASE || 'http://localhost';
export type SUPERSET_API_BASE = typeof SUPERSET_API_BASE;

/** The Superset API endpoint */
export const SUPERSET_API_ENDPOINT = process.env.REACT_APP_SUPERSET_API_ENDPOINT || 'slice';
export type SUPERSET_API_ENDPOINT = typeof SUPERSET_API_ENDPOINT;

/** OpenSRP oAuth2 settings */
export const ENABLE_OPENSRP_OAUTH = process.env.REACT_APP_ENABLE_OPENSRP_OAUTH === 'true';
export type ENABLE_OPENSRP_OAUTH = typeof ENABLE_OPENSRP_OAUTH;
export const OPENSRP_CLIENT_ID = process.env.REACT_APP_OPENSRP_CLIENT_ID || '';
export type OPENSRP_CLIENT_ID = typeof OPENSRP_CLIENT_ID;

// notice the ending is NOT / here
export const OPENSRP_ACCESS_TOKEN_URL =
  process.env.REACT_APP_OPENSRP_ACCESS_TOKEN_URL ||
  'https://reveal-stage.smartregister.org/opensrp/oauth/token';
export type OPENSRP_ACCESS_TOKEN_URL = typeof OPENSRP_ACCESS_TOKEN_URL;

// notice the ending is NOT / here
export const OPENSRP_AUTHORIZATION_URL =
  process.env.REACT_APP_OPENSRP_AUTHORIZATION_URL ||
  'https://reveal-stage.smartregister.org/opensrp/oauth/authorize';
export type OPENSRP_AUTHORIZATION_URL = typeof OPENSRP_AUTHORIZATION_URL;

export const OPENSRP_USER_URL =
  process.env.REACT_APP_OPENSRP_USER_URL ||
  'https://reveal-stage.smartregister.org/opensrp/user-details';
export type OPENSRP_USER_URL = typeof OPENSRP_USER_URL;

export const OPENSRP_OAUTH_STATE = process.env.REACT_APP_OPENSRP_OAUTH_STATE || 'opensrp';
export type OPENSRP_OAUTH_STATE = typeof OPENSRP_OAUTH_STATE;

/** Onadata oAuth2 settings */
export const ENABLE_ONADATA_OAUTH = process.env.REACT_APP_ENABLE_ONADATA_OAUTH === 'true';
export type ENABLE_ONADATA_OAUTH = typeof ENABLE_ONADATA_OAUTH;
export const ONADATA_CLIENT_ID = process.env.REACT_APP_ONADATA_CLIENT_ID || '';
export type ONADATA_CLIENT_ID = typeof ONADATA_CLIENT_ID;

// notice the ending / here
export const ONADATA_ACCESS_TOKEN_URL =
  process.env.REACT_APP_ONADATA_ACCESS_TOKEN_URL || 'https://stage-api.ona.io/o/token/';
export type ONADATA_ACCESS_TOKEN_URL = typeof ONADATA_ACCESS_TOKEN_URL;

// notice the ending / here
export const ONADATA_AUTHORIZATION_URL =
  process.env.REACT_APP_ONADATA_AUTHORIZATION_URL || 'https://stage-api.ona.io/o/authorize/';
export type ONADATA_AUTHORIZATION_URL = typeof ONADATA_AUTHORIZATION_URL;

export const ONADATA_USER_URL =
  process.env.REACT_APP_ONADATA_USER_URL || 'https://stage-api.ona.io/api/v1/user.json';
export type ONADATA_USER_URL = typeof ONADATA_USER_URL;

export const ONADATA_OAUTH_STATE = process.env.REACT_APP_ONADATA_OAUTH_STATE || 'onadata';
export type ONADATA_OAUTH_STATE = typeof ONADATA_OAUTH_STATE;

export const GISIDA_ONADATA_API_TOKEN = process.env.REACT_APP_GISIDA_ONADATA_API_TOKEN || '';
export type GISIDA_ONADATA_API_TOKEN = typeof GISIDA_ONADATA_API_TOKEN;

// notice the trailing /
export const OPENSRP_API_BASE_URL =
  process.env.REACT_APP_OPENSRP_API_BASE_URL ||
  'https://reveal-stage.smartregister.org/opensrp/rest/';
export type OPENSRP_API_BASE_URL = typeof OPENSRP_API_BASE_URL;

/** the clients endpoint NOTE: does not end with / */
export const OPENSRP_CLIENT_ENDPOINT =
  process.env.REACT_APP_OPENSRP_CLIENT_ENDPOINT || 'client/search';
export type OPENSRP_CLIENT_ENDPOINT = typeof OPENSRP_CLIENT_ENDPOINT;