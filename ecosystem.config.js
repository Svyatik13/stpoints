module.exports = {
  apps: [
    {
      name: 'stpoints-backend',
      cwd: './backend',
      script: 'dist/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '800M',
    },
    {
      name: 'stpoints-frontend',
      cwd: './frontend',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '800M',
    },
  ],
};
