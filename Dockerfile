FROM node:9.2-alpine
RUN npm install -g yildiz
ADD config/docker.json /opt/docker.json
CMD ["yildizdb", "-p", "3058", "-l", "/opt/docker.json"]