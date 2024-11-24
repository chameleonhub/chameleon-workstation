import { useRouteError, isRouteErrorResponse } from 'react-router-dom';

export const ErrorPage = () => {
    const error = useRouteError();
    console.error(error);

    let errorMessage: string;

    if (isRouteErrorResponse(error)) {
        errorMessage = error.statusText;
    } else if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    } else {
        console.error(error);
        errorMessage = 'Unknown error';
    }

    return (
        <div id="error-page">
            <h1>Oops!</h1>
            <p>Sorry, an unexpected error has occurred.</p>
            <p>Please close the app and try again. If you keep seeing this message, please contact support.</p>
            <p>
                <i>{errorMessage}</i>
            </p>
        </div>
    );
};
