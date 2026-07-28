FROM node:20-alpine AS base
WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm install
RUN npm run prisma:generate
RUN npm --workspace @flashdrop/shared run build
RUN npm --workspace @flashdrop/database run build
RUN npm --workspace @flashdrop/order-worker run build

FROM node:20-alpine
WORKDIR /app
COPY --from=base /app ./
CMD ["npm", "--workspace", "@flashdrop/order-worker", "run", "start"]
