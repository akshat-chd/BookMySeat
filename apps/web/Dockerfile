FROM node:20-alpine AS base
WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm install
RUN npm --workspace @flashdrop/shared run build
RUN npm --workspace @flashdrop/web run build

FROM node:20-alpine
WORKDIR /app
COPY --from=base /app ./
CMD ["npm", "--workspace", "@flashdrop/web", "run", "start"]
