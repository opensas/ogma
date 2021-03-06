module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'build',
        'ci',
        'chore',
        'revert',
        'feat',
        'fix',
        'improvement',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'all',
        'logger',
        'service',
        'module',
        'interceptor',
        'integration',
        'deps',
        'docs',
        'release',
        'express',
        'socket.io',
        'fastify',
        'ws',
        'tcp',
        'kafka',
        'gql',
        'gql-fastify',
        'grpc',
        'mqtt',
        'nats',
        'rmq',
        'redis',
        'benchmarks',
      ],
    ],
  },
};
