[![Atlassian license](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](LICENSE)

## Devs unleashed - Forge app starter

This is a starter app for Devs Unleased hackathon.

This starter which contains a [PhaserJS](https://phaser.io/) sample game inside a Global Page
module. You can access the page from the top bar menu "Apps" once it's installed, both in Jira and
in Confluence.

The game has examples of rendering project avatars from Jira and reading the spaces data in
Confluence.

## About Forge

See [Atlassian Developer Forge space](https://developer.atlassian.com/platform/forge) for
documentation and tutorials explaining Forge.

## Requirements

-   See [Set up Forge](https://developer.atlassian.com/platform/forge/set-up-forge/) for
    instructions to get set up.

## Quick start

-   Install dependencies by `yarn install`

```
yarn install
```

-   Build both the UI modifications `static/ui-modifications` and admin panel `static/admin-page`
    modules:

```
yarn build
```

-   Or watch changes when you're making modifications:

```
yarn watch
```

-   You can also define specific modules if you're not changing both at the same time

```
yarn build:global-page
```

```
yarn watch:global-page
```

-   Register your app by running:

```
forge register
```

-   Build and deploy your app by running:

```
forge deploy
```

-   Install your app in an Atlassian site by running:

```
forge install
```

-   Develop your app by running `forge tunnel` to proxy invocations locally:

```
forge tunnel
```

### Notes

-   Use the `forge deploy` command when you want to persist code changes.
-   Use the `forge install` command when you want to install the app on a new site.
-   Once the app is installed on a site, the site picks up the new app changes you deploy without
    needing to rerun the install command.
-   Use the `forge install --upgrade` command when you changed permissions scope in `manifest.yml`
    to persist changes.

## License

Copyright (c) 2022 Atlassian and others. Apache 2.0 licensed, see [LICENSE](LICENSE) file.

[![From Atlassian](https://raw.githubusercontent.com/atlassian-internal/oss-assets/master/banner-cheers.png)](https://www.atlassian.com)
