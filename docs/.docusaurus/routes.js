import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/',
    component: ComponentCreator('/', '844'),
    routes: [
      {
        path: '/',
        component: ComponentCreator('/', '20a'),
        routes: [
          {
            path: '/',
            component: ComponentCreator('/', 'f1f'),
            routes: [
              {
                path: '/app/navigation',
                component: ComponentCreator('/app/navigation', '126'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/app/overview',
                component: ComponentCreator('/app/overview', 'c09'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/app/renderer',
                component: ComponentCreator('/app/renderer', 'f3f'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/app/storage',
                component: ComponentCreator('/app/storage', '0b2'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/architecture/data-flow',
                component: ComponentCreator('/architecture/data-flow', '250'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/architecture/overview',
                component: ComponentCreator('/architecture/overview', 'f3c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/architecture/security',
                component: ComponentCreator('/architecture/security', '027'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/guides/adding-actions',
                component: ComponentCreator('/guides/adding-actions', 'fd0'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/guides/adding-components',
                component: ComponentCreator('/guides/adding-components', '292'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/guides/environment',
                component: ComponentCreator('/guides/environment', 'd90'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/guides/getting-started',
                component: ComponentCreator('/guides/getting-started', '86d'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/schema/actions',
                component: ComponentCreator('/schema/actions', 'dec'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/schema/capabilities',
                component: ComponentCreator('/schema/capabilities', 'd84'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/schema/components',
                component: ComponentCreator('/schema/components', 'f09'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/schema/effects',
                component: ComponentCreator('/schema/effects', 'e8b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/server/endpoints',
                component: ComponentCreator('/server/endpoints', 'e96'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/server/generation',
                component: ComponentCreator('/server/generation', '6cc'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/server/overview',
                component: ComponentCreator('/server/overview', '1ff'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/',
                component: ComponentCreator('/', '7da'),
                exact: true,
                sidebar: "docs"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
