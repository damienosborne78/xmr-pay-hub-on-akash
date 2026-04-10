module.exports = {
  apps: [{
    name: "xmrpay-flow",
    script: "serve.js",
    cwd: "/home/node/.openclaw/workspace/xmrpay-flow-main",
    interpreter: "bun",
    env: {
      NODE_ENV: "production"
    },
    instances: 1,
    autorestart: true,
    watch: false
  }]
};
