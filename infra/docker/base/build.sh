#!/bin/bash

echo "Building base image..."
docker build -t transcendence-base:latest -f ./infra/docker/base/Dockerfile ./infra/docker/base/

echo "Base image built successfully!"
docker images | grep transcendence-base
