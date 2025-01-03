# Package Manager Performance Comparison with Docker

This project serves as a Proof of Concept (POC) to compare the performance and efficiency of different Node.js package managers (npm, pnpm, and bun) in a Dockerized environment.

## Project Purpose

- Compare installation times and cache efficiency between npm, pnpm, and bun
- Evaluate Docker build times with different package managers
- Analyze memory usage and container performance
- Measure node_modules size impact
- Demonstrate best practices for using each package manager in Docker

## Package Managers Compared

- **npm**: The default Node.js package manager
- **pnpm**: Fast, disk space efficient package manager using hard links and a content-addressable store
- **bun**: All-in-one JavaScript runtime and package manager with focus on performance

## Benchmark Metrics

The benchmark script (`benchmark-report.sh`) measures:

1. **Cold Cache Build**: Initial build time with no cached dependencies
2. **Warm Cache Build**: Subsequent build time with cached dependencies
3. **Service Startup**: Time taken to start the containerized application
4. **Resource Usage**: 
   - Memory consumption (RAM usage)
   - node_modules size on disk

## Running Benchmarks

1. Ensure Docker and docker-compose are installed and running
2. Make the benchmark script executable:
   ```bash
   chmod +x benchmark-report.sh
   ```
3. Run the benchmark:
   ```bash
   ./benchmark-report.sh
   ```

The script will:
- Generate a timestamped report in the `reports/` directory (e.g., `benchmark_report_20250103_163325.md`)
- Clean Docker state between tests for accurate results
- Test each package manager sequentially
- Provide detailed metrics for each test phase
- Include a summary table for quick comparison

## Example Report Output

Here's an example of what the benchmark report looks like:

____

> # 📊 Package Manager Benchmark Report
> Generated on: Fri Jan 3 16:33:25 +07 2025
> 
> ## npm Test Results
> ### 1. Cold Cache Build Test
> - Duration: 53s
> 
> ### 2. Warm Cache Build Test
> - Duration: 7s
> 
> ### 3. Service Startup
> - Startup Duration: 15s
> 
> ### 4. Resource Usage
> - Memory Usage: 49.52MiB / 7.654GiB
> - node_modules Size: 193.4M	/app/node_modules
> 
> ## pnpm Test Results
> ### 1. Cold Cache Build Test
> - Duration: 28s
> 
> ### 2. Warm Cache Build Test
> - Duration: 5s
> 
> ### 3. Service Startup
> - Startup Duration: 16s
> 
> ### 4. Resource Usage
> - Memory Usage: 88.91MiB / 7.654GiB
> - node_modules Size: 191.8M	/app/node_modules
> 
> ## bun Test Results
> ### 1. Cold Cache Build Test
> - Duration: 15s
> 
> ### 2. Warm Cache Build Test
> - Duration: 3s
> 
> ### 3. Service Startup
> - Startup Duration: 16s
> 
> ### 4. Resource Usage
> - Memory Usage: 57.61MiB / 7.654GiB
> - node_modules Size: 267M	/app/node_modules
> 
> ## Summary
> ### Quick Comparison
> | Package Manager | Cold Build | Warm Build | Memory Usage | node_modules Size |
> |----------------|------------|------------|--------------|------------------|
> | npm | 53s | 7s | 49.52MiB | 193.4M |
> | pnpm | 28s | 5s | 88.91MiB | 191.8M |
> | bun | 15s | 3s | 57.61MiB | 267M |

____

## Docker Configurations

Each package manager has its own Dockerfile optimized for best practices:
- `Dockerfile.npm`
- `Dockerfile.pnpm`
- `Dockerfile.bun`

## Contributing

Feel free to contribute by:
- Running benchmarks on different hardware/environments
- Adding more package managers
- Improving Docker configurations
- Suggesting optimization techniques

## License

MIT