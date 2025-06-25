FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . ./
ENV PYTHON_BASE_URL=http://python:8000
EXPOSE 3010
CMD ["npm","start"]
