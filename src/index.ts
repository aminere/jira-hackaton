import api, { route } from '@forge/api';
import Resolver from '@forge/resolver';
import { RESOLVERS } from './types';

const jsonHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
};

const resolver = new Resolver();

resolver.define(RESOLVERS.GET_ISSUES, async ({ payload }) => {    
    const requestURL = route`/rest/api/3/search`;

    const res = await api.asApp().requestJira(requestURL, {
        headers: {
            ...jsonHeaders,
        },
    });

    const status = res;
    const data = await res.json();
    return { status, data };
});

resolver.define(RESOLVERS.GET_ISSUE, async ({ payload }) => {
    const { issueId } = payload;
    const requestURL = route`/rest/api/3/search?jql=id=${issueId}`;
    const res = await api.asApp().requestJira(requestURL, {
        headers: {
            ...jsonHeaders,
        },
    });
    const status = res;
    const data = await res.json();
    return { status, data };
});

export const handler = resolver.getDefinitions();

