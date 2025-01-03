#!/bin/bash

echo "Building and measuring Docker images..."
echo "======================================="

# Function to convert size to human readable format
human_size() {
    numfmt --to=iec-i --suffix=B $1
}

# Function to build and measure
build_and_measure() {
    local package_manager=$1
    local dockerfile="Dockerfile.$package_manager"
    
    echo "Testing $package_manager..."
    echo "-------------------------"
    
    # Remove existing image if it exists
    docker rmi "node-app-$package_manager" 2>/dev/null
    
    # Build with time measurement
    echo "Build time:"
    time docker build -f $dockerfile -t "node-app-$package_manager" .
    
    # Get image size
    size=$(docker image inspect "node-app-$package_manager" --format='{{.Size}}')
    echo "Image size: $(human_size $size)"
    echo
}

# Clean up
docker builder prune -f

# Run benchmarks
build_and_measure "npm"
build_and_measure "pnpm"
build_and_measure "bun"

echo "Summary of image sizes:"
echo "----------------------"
docker images | grep "node-app-"
