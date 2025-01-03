#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create reports directory if it doesn't exist and ensure it's not ignored
mkdir -p ./reports

# Set timestamp for the report file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="./reports/benchmark_report_${TIMESTAMP}.md"

# Create and set permissions for the report file
touch "$REPORT_FILE"
chmod 644 "$REPORT_FILE"

# Initialize report file with header
echo "# Package Manager Benchmark Report" > "$REPORT_FILE"
echo "Generated on: $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

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

# Function to format duration
format_duration() {
    local start=$1
    local end=$2
    local duration=$((end - start))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    if [ $minutes -gt 0 ]; then
        echo "${minutes}m ${seconds}s"
    else
        echo "${seconds}s"
    fi
}

# Function to run tests for each package manager
run_tests() {
    local pm=$1
    local service_name="app-$pm"
    
    echo -e "${GREEN}Testing $pm...${NC}"
    echo "## $pm Test Results" >> $REPORT_FILE
    
    # Clean state
    echo "### Cleaning previous state..." >> $REPORT_FILE
    docker-compose down -v
    docker-compose rm -f
    docker system prune -f
    
    # Test 1: Cold cache build
    echo "### 1. Cold Cache Build Test" >> $REPORT_FILE
    local cold_start=$(date +%s)
    time docker-compose build --no-cache $service_name 2>&1 | tee -a build_output.tmp
    local cold_end=$(date +%s)
    local cold_duration=$(format_duration $cold_start $cold_end)
    echo "- Duration: $cold_duration" >> $REPORT_FILE
    
    # Test 2: Warm cache build
    echo -e "\n### 2. Warm Cache Build Test" >> $REPORT_FILE
    local warm_start=$(date +%s)
    time docker-compose build $service_name 2>&1 | tee -a build_output.tmp
    local warm_end=$(date +%s)
    local warm_duration=$(format_duration $warm_start $warm_end)
    echo "- Duration: $warm_duration" >> $REPORT_FILE
    
    # Start services
    echo -e "\n### 3. Service Startup" >> $REPORT_FILE
    local startup_start=$(date +%s)
    docker-compose up -d $service_name
    echo "Waiting for service to be ready..."
    sleep 10
    local startup_end=$(date +%s)
    local startup_duration=$(format_duration $startup_start $startup_end)
    echo "- Startup Duration: $startup_duration" >> $REPORT_FILE
    
    # Test 3: Memory Usage
    echo -e "\n### 4. Resource Usage" >> $REPORT_FILE
    local memory=$(measure_memory $service_name)
    echo "- Memory Usage: $memory" >> $REPORT_FILE
    
    # Test 4: node_modules size
    local modules_size=$(measure_node_modules_size $service_name)
    echo "- node_modules Size: $modules_size" >> $REPORT_FILE
            
    # Clean up
    rm build_output.tmp
    docker-compose stop $service_name
    
    echo -e "\n---\n" >> $REPORT_FILE
}

# Function to extract data from report
extract_data() {
    local pm=$1
    local field=$2
    local section_start="## $pm Test Results"
    
    case $field in
        "cold")
            sed -n "/$section_start/,/## .* Test Results/p" "$REPORT_FILE" | grep -A 1 "1\. Cold Cache Build Test" | grep "Duration:" | cut -d' ' -f3
            ;;
        "warm")
            sed -n "/$section_start/,/## .* Test Results/p" "$REPORT_FILE" | grep -A 1 "2\. Warm Cache Build Test" | grep "Duration:" | cut -d' ' -f3
            ;;
        "memory")
            sed -n "/$section_start/,/## .* Test Results/p" "$REPORT_FILE" | grep "Memory Usage:" | cut -d' ' -f4
            ;;
        "size")
            sed -n "/$section_start/,/## .* Test Results/p" "$REPORT_FILE" | grep "node_modules Size:" | cut -d' ' -f4
            ;;
    esac
}

echo -e "${BLUE}Starting comprehensive package manager benchmark...${NC}\n"

# Run tests for each package manager
for pm in npm pnpm bun; do
    run_tests "$pm"
done

# Generate summary table
echo "## Summary" >> $REPORT_FILE
echo "### Quick Comparison" >> $REPORT_FILE
echo "| Package Manager | Cold Build | Warm Build | Memory Usage | node_modules Size |" >> $REPORT_FILE
echo "|----------------|------------|------------|--------------|------------------|" >> $REPORT_FILE

for pm in npm pnpm bun; do
    cold_build=$(extract_data "$pm" "cold")
    warm_build=$(extract_data "$pm" "warm")
    memory=$(extract_data "$pm" "memory")
    modules_size=$(extract_data "$pm" "size")
    echo "| $pm | $cold_build | $warm_build | $memory | $modules_size |" >> $REPORT_FILE
done

# Final cleanup
docker-compose down -v

echo -e "${BLUE}Benchmark complete! Report generated: $REPORT_FILE${NC}"
