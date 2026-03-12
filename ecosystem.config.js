module.exports = {
  apps: [
    {
      name: "dfix-client",
      cwd: "/root/e--commerce--tape/client",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },
    {
      name: "dfix-admin",
      cwd: "/root/e--commerce--tape/front",
      script: "npm",
      args: "run preview",
      env: {
        NODE_ENV: "production",
        PORT: 4173
      }
    },
    {
      name: "dfix-server",
      cwd: "/root/e--commerce--tape/server",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: 4000
      }
    }
  ]
};
