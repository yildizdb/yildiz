FROM node:9.2-alpine
RUN npm install -g krakn
ADD config/docker.json /opt/docker.json
CMD ["krakndb", "-p", "3058", "-l", "/opt/docker.json"]