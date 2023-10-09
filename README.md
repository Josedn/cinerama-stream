# cinerama-stream
Proof of concept: Torrent streaming server

## How to run 
Create `.env` using `.env.example` as example. You also can use environment variables.

    npm install
    npm start

## How to run with docker

    docker build . -t cinerama-stream
    docker run -p 127.0.0.1:1232:1232 -d cinerama-stream