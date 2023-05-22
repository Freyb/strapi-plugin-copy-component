module.exports = [
  {
    method: 'GET',
    path: '/getSlugs',
    handler: 'dataController.getSlugs',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/getComponents',
    handler: 'dataController.getComponents',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/config',
    handler: 'configController.getConfig',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
];
