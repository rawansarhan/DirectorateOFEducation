#!/bin/bash
# انتظر DB جاهز
sleep 5

# شغل migrations
npx sequelize-cli db:migrate

# شغل seeders
npx sequelize-cli db:seed:all

# شغل السيرفر
npm run dev
