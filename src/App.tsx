import { createHashRouter, RouterProvider } from 'react-router-dom';

import { Dashboard } from './components/dashboard/Dashboard';
import { ErrorPage } from './components/common/ErrorPage';
import { Form } from './components/forms/Form';
import { DraftList } from './components/list/DraftList';
import { IFrame } from './components/layout/IFrame';
import { Layout } from './components/layout/Layout';
import { List } from './components/list/List';
import { Menu } from './components/layout/Menu';
import { SignIn } from './components/auth/SignIn';

export const App = () => {
    const router = createHashRouter([
        {
            path: '/',
            element: <Layout hasHeader={false} />,
            children: [
                {
                    path: '/',
                    element: <SignIn />,
                    errorElement: <ErrorPage />,
                },
            ],
        },
        {
            element: <Layout />,
            children: [
                {
                    path: 'menu/:menu_id',
                    element: <Menu />,
                    errorElement: <ErrorPage />,
                },
                {
                    path: 'form/:form_uid',
                    element: <Form />,
                    errorElement: <ErrorPage />,
                },
                {
                    path: 'form/draft/:form_uid/:instance_id',
                    element: <Form draft={true} />,
                    errorElement: <ErrorPage />,
                },
                {
                    path: 'form/details/:form_uid/:instance_id',
                    element: <Form />,
                    errorElement: <ErrorPage />,
                },
                {
                    path: 'list/:form_uid',
                    element: <List />,
                    errorElement: <ErrorPage />,
                },
                {
                    path: 'list/drafts',
                    element: <DraftList />,
                    errorElement: <ErrorPage />,
                },
                {
                    path: 'dashboard/:form_uid',
                    element: <Dashboard />,
                    errorElement: <ErrorPage />,
                },
                {
                    path: 'iframe',
                    element: <IFrame />,
                    errorElement: <ErrorPage />,
                },
            ],
        },
        {
            path: '*',
            element: <ErrorPage />,
        },
    ]);

    return <RouterProvider router={router}></RouterProvider>;
};
