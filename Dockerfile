# Zero-dependency Node.js JSON API. No npm install needed (no runtime deps),
# so the image is just the current slim Node base plus source files.
FROM node:22-alpine

# apk upgrade: official base images lag CVE fixes by days, and the Trivy gate
# fails on fixable HIGH/CRITICAL vulns. Keep this line current at build time.
RUN apk upgrade --no-cache

WORKDIR /app

COPY package.json ./
COPY server.js ./

ENV PORT=8080
EXPOSE 8080

# node:22-alpine already ships a non-root "node" user (uid 1000); use it
# explicitly so the Dockerfile itself satisfies the non-root scan check.
USER node

CMD ["node", "server.js"]
