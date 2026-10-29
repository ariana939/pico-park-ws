FROM node:24-slim
WORKDIR /app

COPY servidor/package*.json ./servidor/
RUN npm --prefix ./servidor install --omit=dev

COPY servidor/ ./servidor/
COPY host-juego/ ./host-juego/

WORKDIR /app/servidor

EXPOSE 3000

CMD ["node", "index.ts"]

