#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Starting comprehensive package manager benchmark...${NC}\n"

# Function to measure memory usage of a container
measure_memory() {
    local container_name=$1
    docker stats --no-stream --format "{{.MemUsage}}" "$container_name"
}

# Function to measure node_modules size
measure_node_modules_size() {
    local container_name=$1
    docker exec "$container_name" du -sh /app/node_modules
}

# Function to run tests for each package manager
run_tests() {
    local pm=$1
    local dockerfile="Dockerfile.$pm"
    
    echo -e "${GREEN}Testing $pm...${NC}"
    
    # Clean state
    docker system prune -f
    docker rmi "docker-poc-app-$pm" || true
    
    # Test 1: Cold cache build
    echo "1. Cold Cache Build Test"
    time docker build -f "$dockerfile" -t "docker-poc-app-$pm" . --no-cache
    
    # Test 2: Warm cache build
    echo -e "\n2. Warm Cache Build Test"
    time docker build -f "$dockerfile" -t "docker-poc-app-$pm" .
    
    # Start container for memory and size tests
    container_name="test-$pm"
    docker run -d --name "$container_name" "docker-poc-app-$pm"
    
    # Test 3: Memory Usage
    echo -e "\n3. Memory Usage"
    measure_memory "$container_name"
    
    # Test 4: node_modules size
    echo -e "\n4. node_modules Size"
    measure_node_modules_size "$container_name"
    
    # Clean up
    docker stop "$container_name"
    docker rm "$container_name"
    
    echo -e "\n----------------------------------------\n"
}

# Run tests for each package manager
for pm in npm pnpm bun; do
    run_tests "$pm"
done

echo -e "${BLUE}Benchmark complete!${NC}"
