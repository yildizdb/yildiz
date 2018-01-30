FROM node:9.4
RUN yarn global add yildiz
ADD config/docker.json /opt/docker.json
CMD ["yildizdb", "-p", "3058", "-l", "/opt/docker.json"]