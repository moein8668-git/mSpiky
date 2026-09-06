import * as esbuild from "esbuild";

const shared = {
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["electron", "ws", "uiohook-napi"],
  sourcemap: true,
};

await esbuild.build({
  ...shared,
  entryPoints: ["electron/main.ts"],
  outfile: "dist-electron/main.cjs",
});

await esbuild.build({
  ...shared,
  entryPoints: ["electron/preload.ts"],
  outfile: "dist-electron/preload.cjs",
});

await esbuild.build({
  ...shared,
  entryPoints: ["electron/preload-studio.ts"],
  outfile: "dist-electron/preload-studio.cjs",
});
