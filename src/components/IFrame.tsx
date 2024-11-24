import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { log } from '../helpers/log';
import { Loading } from './Loading';
import { ipcRenderer } from 'electron';

const encodeAdministrativeRegion = (administrativeRegionID) => {
    const encodedAdministrativeRegionID = administrativeRegionID * 42;
    const bufferedAdministrativeRegionID = encodedAdministrativeRegionID.toString().padStart(12, '0');
    const encodedAdministrativeRegion = bufferedAdministrativeRegionID
        .split('')
        .map((char) => String.fromCharCode(66 + parseInt(char)))
        .join('');
    return encodedAdministrativeRegion;
};

export const IFrame = () => {
    const [externalUrl, setExternalURL] = useState<string | null>();
    const [encodedAdministrativeRegion, setEncodedAdministrativeRegion] = useState<string>();
    const [completeURL, setCompleteURL] = useState<string>();
    const searchParams = useSearchParams()[0];

    useEffect(() => {
        ipcRenderer
            .invoke('read-user-administrative-region')
            .then((response) => {
                log.info(`Administrative region: ${JSON.stringify(response)}`);
                setEncodedAdministrativeRegion(encodeAdministrativeRegion(response['3'])); // FIXME this is hardcoded to the 3rd administrative region
            })
            .catch((error) => {
                log.error(`Error getting administrative region: ${error}`);
            });
    }, []);

    useEffect(() => {
        if (searchParams.get('url')) {
            setExternalURL(searchParams.get('url'));
        }
    }, [searchParams]);

    useEffect(() => {
        setCompleteURL(`${externalUrl}${encodedAdministrativeRegion}`);
        log.info(`loading IFrame for url: ${JSON.stringify(`${externalUrl}${encodedAdministrativeRegion}`)}`);
    }, [externalUrl, encodedAdministrativeRegion]);

    if (completeURL) {
        return <iframe src={completeURL} style={{ width: '95%', height: '85vh', margin: '2.5%' }}></iframe>;
    } else {
        return <Loading />;
    }
};
