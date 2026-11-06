# voxelcode production image (Next.js). The Java/C/Go compile server is OFF: it must never run on a public host.

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: the postinstall step needs the source tree, which is copied next. `npm run build` redoes it.
RUN npm ci --ignore-scripts
COPY . .
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
# prebuild copies Monaco + Pyodide into /public and bundles the runner workers.
RUN npm run build && npm prune --omit=dev

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    VOXELCODE_NATIVE_RUNNER=off
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.mjs ./next.config.mjs
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
