import axios from 'axios';
import { getToken } from '../electron/main.ts';

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
export const auth = instance;
