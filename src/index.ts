import api, { route } from '@forge/api';
import Resolver from '@forge/resolver';
import { RESOLVERS } from './types';

const jsonHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
};

const logJson = (content, context = '') => {
    console.log(context, JSON.stringify(content, null, 2));
};

const resolver = new Resolver();

resolver.define(RESOLVERS.GET_PROJECTS, async ({ payload }) => {
    const params = new URLSearchParams(payload || {});
    const requestURL = route`/rest/api/3/project/search?${params}`;

    console.log(requestURL);

    const res = await api.asApp().requestJira(requestURL, {
        headers: {
            ...jsonHeaders,
        },
    });

    const status = res;
    const data = await res.json();
    logJson(res, 'status');
    logJson(data, 'data');
    return { status, data };
});

resolver.define(RESOLVERS.GET_SPACES, async ({ payload }) => {
    const params = new URLSearchParams(payload || {});
    const requestURL = route`/wiki/rest/api/space?${params}`;

    console.log(requestURL);

    const res = await api.asUser().requestConfluence(requestURL, {
        headers: {
            ...jsonHeaders,
        },
    });

    const status = res;
    const data = await res.json();
    logJson(res, 'status');
    logJson(data, 'data');

    return { status, data };
});

export const handler = resolver.getDefinitions();
