#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Starting comprehensive package manager benchmark with docker-compose...${NC}\n"

# Function to measure memory usage of a container
measure_memory() {
    local service_name=$1
    docker-compose ps -q $service_name | xargs docker stats --no-stream --format "{{.MemUsage}}"
}

# Function to measure node_modules size
measure_node_modules_size() {
    local service_name=$1
    docker-compose exec $service_name du -sh /app/node_modules
}

# Function to run tests for each package manager
run_tests() {
    local pm=$1
    local service_name="app-$pm"
    
    echo -e "${GREEN}Testing $pm...${NC}"
    
    # Clean state
    docker-compose down -v
    docker-compose rm -f
    docker system prune -f
    
    # Test 1: Cold cache build
    echo "1. Cold Cache Build Test"
    time docker-compose build --no-cache $service_name
    
    # Test 2: Warm cache build
    echo -e "\n2. Warm Cache Build Test"
    time docker-compose build $service_name
    
    # Start services
    echo -e "\n3. Starting services..."
    docker-compose up -d $service_name
    
    # Wait for service to be healthy
    echo "Waiting for service to be ready..."
    sleep 10
    
    # Test 3: Memory Usage
    echo -e "\n4. Memory Usage"
    measure_memory $service_name
    
    # Test 4: node_modules size
    echo -e "\n5. node_modules Size"
    measure_node_modules_size $service_name
    
    # Clean up
    docker-compose stop $service_name
    
    echo -e "\n----------------------------------------\n"
}

# Run tests for each package manager
for pm in npm pnpm bun; do
    run_tests "$pm"
done

# Final cleanup
docker-compose down -v
echo -e "${BLUE}Benchmark complete!${NC}"
