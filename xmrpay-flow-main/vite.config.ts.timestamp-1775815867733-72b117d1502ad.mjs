// vite.config.ts
import { defineConfig } from "file:///home/node/.openclaw/workspace/xmrpay-flow-main/node_modules/vite/dist/node/index.js";
import react from "file:///home/node/.openclaw/workspace/xmrpay-flow-main/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///home/node/.openclaw/workspace/xmrpay-flow-main/node_modules/lovable-tagger/dist/index.js";
import { nodePolyfills } from "file:///home/node/.openclaw/workspace/xmrpay-flow-main/node_modules/vite-plugin-node-polyfills/dist/index.js";
import { copyFileSync, mkdirSync, existsSync } from "fs";
var __vite_injected_original_dirname = "/home/node/.openclaw/workspace/xmrpay-flow-main";
try {
  mkdirSync("public", { recursive: true });
  const workerSrc = "node_modules/monero-ts/dist/monero.worker.js";
  if (existsSync(workerSrc)) {
    copyFileSync(workerSrc, "public/monero.worker.js");
  }
} catch {
}
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: true,
    hmr: {
      overlay: false
    }
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    nodePolyfills({ include: ["http", "https", "fs", "stream", "util", "path", "os", "url"] })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"]
  },
  build: {
    commonjsOptions: { transformMixedEsModules: true }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9ub2RlLy5vcGVuY2xhdy93b3Jrc3BhY2UveG1ycGF5LWZsb3ctbWFpblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvbm9kZS8ub3BlbmNsYXcvd29ya3NwYWNlL3htcnBheS1mbG93LW1haW4vdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvbm9kZS8ub3BlbmNsYXcvd29ya3NwYWNlL3htcnBheS1mbG93LW1haW4vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcbmltcG9ydCB7IG5vZGVQb2x5ZmlsbHMgfSBmcm9tIFwidml0ZS1wbHVnaW4tbm9kZS1wb2x5ZmlsbHNcIjtcbmltcG9ydCB7IGNvcHlGaWxlU3luYywgbWtkaXJTeW5jLCBleGlzdHNTeW5jIH0gZnJvbSBcImZzXCI7XG5cbi8vIENvcHkgbW9uZXJvIFdBU00gd29ya2VyIHRvIHB1YmxpYy8gc28gaXQncyBzZXJ2ZWQgc3RhdGljYWxseVxudHJ5IHtcbiAgbWtkaXJTeW5jKFwicHVibGljXCIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICBjb25zdCB3b3JrZXJTcmMgPSBcIm5vZGVfbW9kdWxlcy9tb25lcm8tdHMvZGlzdC9tb25lcm8ud29ya2VyLmpzXCI7XG4gIGlmIChleGlzdHNTeW5jKHdvcmtlclNyYykpIHtcbiAgICBjb3B5RmlsZVN5bmMod29ya2VyU3JjLCBcInB1YmxpYy9tb25lcm8ud29ya2VyLmpzXCIpO1xuICB9XG59IGNhdGNoIHt9XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiBcIjo6XCIsXG4gICAgcG9ydDogODA4MCxcbiAgICBhbGxvd2VkSG9zdHM6IHRydWUsXG4gICAgaG1yOiB7XG4gICAgICBvdmVybGF5OiBmYWxzZSxcbiAgICB9LFxuICB9LFxuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICBtb2RlID09PSBcImRldmVsb3BtZW50XCIgJiYgY29tcG9uZW50VGFnZ2VyKCksXG4gICAgbm9kZVBvbHlmaWxscyh7IGluY2x1ZGU6IFtcImh0dHBcIiwgXCJodHRwc1wiLCBcImZzXCIsIFwic3RyZWFtXCIsIFwidXRpbFwiLCBcInBhdGhcIiwgXCJvc1wiLCBcInVybFwiXSB9KSxcbiAgXS5maWx0ZXIoQm9vbGVhbiksXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgICBkZWR1cGU6IFtcInJlYWN0XCIsIFwicmVhY3QtZG9tXCIsIFwicmVhY3QvanN4LXJ1bnRpbWVcIiwgXCJyZWFjdC9qc3gtZGV2LXJ1bnRpbWVcIiwgXCJAdGFuc3RhY2svcmVhY3QtcXVlcnlcIiwgXCJAdGFuc3RhY2svcXVlcnktY29yZVwiXSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICBjb21tb25qc09wdGlvbnM6IHsgdHJhbnNmb3JtTWl4ZWRFc01vZHVsZXM6IHRydWUgfSxcbiAgfSxcbn0pKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBK1QsU0FBUyxvQkFBb0I7QUFDNVYsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHVCQUF1QjtBQUNoQyxTQUFTLHFCQUFxQjtBQUM5QixTQUFTLGNBQWMsV0FBVyxrQkFBa0I7QUFMcEQsSUFBTSxtQ0FBbUM7QUFRekMsSUFBSTtBQUNGLFlBQVUsVUFBVSxFQUFFLFdBQVcsS0FBSyxDQUFDO0FBQ3ZDLFFBQU0sWUFBWTtBQUNsQixNQUFJLFdBQVcsU0FBUyxHQUFHO0FBQ3pCLGlCQUFhLFdBQVcseUJBQXlCO0FBQUEsRUFDbkQ7QUFDRixRQUFRO0FBQUM7QUFHVCxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssT0FBTztBQUFBLEVBQ3pDLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLGNBQWM7QUFBQSxJQUNkLEtBQUs7QUFBQSxNQUNILFNBQVM7QUFBQSxJQUNYO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sU0FBUyxpQkFBaUIsZ0JBQWdCO0FBQUEsSUFDMUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxRQUFRLFNBQVMsTUFBTSxVQUFVLFFBQVEsUUFBUSxNQUFNLEtBQUssRUFBRSxDQUFDO0FBQUEsRUFDM0YsRUFBRSxPQUFPLE9BQU87QUFBQSxFQUNoQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxJQUNBLFFBQVEsQ0FBQyxTQUFTLGFBQWEscUJBQXFCLHlCQUF5Qix5QkFBeUIsc0JBQXNCO0FBQUEsRUFDOUg7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLGlCQUFpQixFQUFFLHlCQUF5QixLQUFLO0FBQUEsRUFDbkQ7QUFDRixFQUFFOyIsCiAgIm5hbWVzIjogW10KfQo=
