import axios, { AxiosRequestConfig } from 'axios';
import { getToken } from '../electron/main.ts';
import axiosRetry from 'axios-retry';

export interface AxiosRetryRequestConfig extends AxiosRequestConfig {
    retry?: boolean;
}

const instance = axios.create({
    // baseURL: import.meta.env.VITE_BAHIS_SERVER_URL,
    headers: { 'Content-Type': 'application/json' },
});

instance.interceptors.request.use(
    async function (config) {
        const token = await getToken().then((token) => token);
        if (token) {
            config.headers['Authorization'] = `TOKEN ${token}`;
        }

        return config;
    },
    function (error) {
        return Promise.reject(error);
    },
);

axiosRetry(instance, {
    retries: 10,
    retryDelay: axiosRetry.linearDelay(),
    retryCondition: (error) => {
        console.log('count asd', axiosRetry.isNetworkOrIdempotentRequestError(error), error?.response?.status);
        const config = error.config as AxiosRetryRequestConfig;
        return (config.retry === true &&
            (axiosRetry.isNetworkOrIdempotentRequestError(error) ||
                (error.response?.status && error.response?.status >= 500))) as boolean;
    },
    onRetry: (retryCount, error, requestConfig) => {
        console.log(retryCount, error.message, requestConfig.url);
    },
});

export const auth = instance;
