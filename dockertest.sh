docker build --no-cache -t yildiz:test .
docker run -it --rm -p 3058:3058 --name yildiztest yildiz:test