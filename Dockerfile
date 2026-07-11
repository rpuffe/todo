# Zero-dependency Node.js JSON API. No npm install needed (no runtime deps),
# so the image is just the current slim Node base plus source files.
FROM node:22-alpine

# apk upgrade: official base images lag CVE fixes by days, and the Trivy gate
# fails on fixable HIGH/CRITICAL vulns. Keep this line current at build time.
RUN apk upgrade --no-cache

# This app has zero runtime npm dependencies (plain node:http, node:crypto),
# so npm/npx/corepack are dead weight — and the npm CLI node:22-alpine ships
# bundles its own vulnerable transitive deps (e.g. picomatch, sigstore) that
# trip the Trivy HIGH/CRITICAL gate even though nothing in this image ever
# invokes npm. Remove them rather than chase CVEs in code we never run.
RUN rm -rf /usr/local/lib/node_modules/npm \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
    /opt/yarn*

WORKDIR /app

COPY package.json ./
COPY server.js ./

ENV PORT=8080
EXPOSE 8080

# node:22-alpine already ships a non-root "node" user (uid 1000); use it
# explicitly so the Dockerfile itself satisfies the non-root scan check.
USER node

CMD ["node", "server.js"]
