module.exports = {
  apps: [{
    name: "xmrpay-flow",
    script: "bun",
    args: "x serve -s dist -l 3001",
    cwd: "/home/node/.openclaw/workspace/xmrpay-flow-main",
    interpreter: "none",
    env: {
      NODE_ENV: "production"
    },
    instances: 1,
    autorestart: true,
    watch: false
  }]
};
