#version 2.0

FROM node:14

WORKDIR /my-app
COPY . .


RUN npm install
RUN npm install express
RUN npm install axios
RUN npm install express-fileupload
RUN npm install ejs
RUN npm install multer
RUN npm install fs
RUN npm install pdf-img-convert
# EXPOSE 3004
CMD [ "npm", "start" ]