# Stage 1
FROM --platform=linux/amd64 9555v10x.gra7.container-registry.ovh.net/gpf-dockerhub/nikolaik/python-nodejs:python3.10-nodejs20-slim AS build
WORKDIR /app

RUN apt-get update && apt-get install -y build-essential gcc

RUN corepack disable && npm install -g yarn

COPY package.json yarn.lock ./
RUN yarn install --prod --frozen-lockfile

COPY requirements.txt ./
RUN pip install --user -r requirements.txt

# Stage 2
FROM --platform=linux/amd64 redis:7.0 AS redis

# Stage 3
FROM --platform=linux/amd64 9555v10x.gra7.container-registry.ovh.net/gpf-dockerhub/nikolaik/python-nodejs:python3.10-nodejs20-slim
WORKDIR /app

COPY --from=redis /usr/local/bin/redis-server /usr/local/bin/redis-server
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /root/.local /root/.local

RUN apt-get update && \
    apt-get install -y p7zip-full curl wget && \
    wget -q https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -O /usr/bin/yq && \
    chmod +x /usr/bin/yq && \
    rm -rf /var/lib/apt/lists/*

RUN corepack disable && npm install -g yarn

COPY . .

ENV PATH=/root/.local/bin:$PATH
ENV NODE_ENV production
ENV TMP_PATH /tmp
ENV DATA_PATH /data
ENV PORT 3000

EXPOSE 3000

CMD ["yarn", "start"]
