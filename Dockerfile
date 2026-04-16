FROM node:20

WORKDIR /app

# تثبيت dependencies
COPY package*.json ./
RUN npm install

# نسخ المشروع كامل
COPY . .

# entrypoint
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 4000

CMD ["./entrypoint.sh"]
