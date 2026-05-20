#!/bin/bash

# Comprehensive Disk Space Cleanup Script
# WARNING: This script performs aggressive cleanup. Review before running.
# Run with sudo privileges

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check for root privileges
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: Please run as root (sudo)${NC}"
    exit 1
fi

# Function to print section headers
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Function to print success messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to format sizes
format_size() {
    local size=$1
    if [ $size -gt 1073741824 ]; then
        echo "$(awk "BEGIN {printf \"%.2f\", $size/1024/1024/1024}") GB"
    elif [ $size -gt 1048576 ]; then
        echo "$(awk "BEGIN {printf \"%.2f\", $size/1024/1024}") MB"
    elif [ $size -gt 1024 ]; then
        echo "$(awk "BEGIN {printf \"%.2f\", $size/1024}") KB"
    else
        echo "${size} B"
    fi
}

# Get initial disk usage
initial_usage=$(df -B1 / | awk 'NR==2 {print $3}')

print_header "Starting Aggressive Disk Cleanup"
echo -e "${YELLOW}⚠️  This will perform a thorough system cleanup${NC}"
sleep 2

# 1. Package Manager Cleanup
print_header "Package Manager Cleanup"

if command -v apt-get &> /dev/null; then
    # APT cleanup
    apt-get clean -y
    apt-get autoremove -y
    apt-get autoclean -y
    rm -rf /var/lib/apt/lists/*
    print_success "APT cache and unused packages cleaned"

elif command -v yum &> /dev/null; then
    # YUM cleanup
    yum clean all
    yum autoremove -y
    print_success "YUM cache and unused packages cleaned"

elif command -v dnf &> /dev/null; then
    # DNF cleanup
    dnf clean all
    dnf autoremove -y
    print_success "DNF cache and unused packages cleaned"
fi

# 2. Docker Cleanup (if installed)
print_header "Docker Resource Cleanup"

if command -v docker &> /dev/null; then
    docker system prune -af --volumes
    docker builder prune -af
    rm -rf ~/.docker/buildx
    print_success "Docker resources cleaned"
fi

# 3. Log File Cleanup
print_header "Log Cleanup"

# System logs
find /var/log -type f -name "*.log" -exec truncate -s 0 {} \;
find /var/log -type f -name "*.gz" -delete
find /var/log -type f -name "*.old" -delete
find /var/log -type f -name "*.1" -delete
find /var/log -type f -name "*.2" -delete
find /var/log -type f -name "*.rotated" -delete

# Journal logs
if command -v journalctl &> /dev/null; then
    journalctl --vacuum-time=3d
    journalctl --vacuum-size=100M
fi

print_success "System logs cleaned"

# 4. Cache Cleanup
print_header "Cache Cleanup"

# Browser caches (for all users)
find /home -type f -path "*/cache/*" -delete
find /home -type f -path "*/.cache/*" -delete
find /root -type f -path "*/cache/*" -delete
find /root -type f -path "*/.cache/*" -delete

# Thumbnail cache
find /home -type f -path "*/.thumbnails/*" -delete
rm -rf ~/.thumbnails/*

# Font cache
fc-cache -f

# Man page cache
if command -v mandb &> /dev/null; then
    rm -rf /var/cache/man/*
    mandb
fi

print_success "System caches cleaned"

# 5. Temp Files Cleanup
print_header "Temporary Files Cleanup"

# System temp directories
rm -rf /tmp/*
rm -rf /var/tmp/*

# User specific temp files
find /home -type f -name "*.tmp" -delete
find /home -type f -name "*.temp" -delete
find /home -type f -name "tmp.*" -delete

# Crash reports and core dumps
rm -rf /var/crash/*
rm -rf /var/cores/*
echo "kernel.core_pattern=|/bin/false" > /etc/sysctl.d/50-coredump.conf
sysctl -p /etc/sysctl.d/50-coredump.conf

print_success "Temporary files cleaned"

# 6. Old Kernel Cleanup
print_header "Kernel Cleanup"

# Keep only the current and one previous kernel version
if command -v dpkg &> /dev/null; then
    current_kernel=$(uname -r | sed 's/-*[a-z].*//g' | sed 's/-$//')
    dpkg -l 'linux-*' | sed '/^ii/!d;/'"${current_kernel}"'/d' | awk '{print $2}' | grep -v -e `uname -r | cut -f1,2 -d"-"` | grep -e '[0-9]' | xargs apt-get -y purge
fi

print_success "Old kernels cleaned"

# 7. Application Specific Cleanup
print_header "Application Specific Cleanup"

# Clean pip cache
if command -v pip3 &> /dev/null; then
    pip3 cache purge
fi

# Clean npm cache
if command -v npm &> /dev/null; then
    npm cache clean --force
fi

# Clean yarn cache
if command -v yarn &> /dev/null; then
    yarn cache clean
fi

# Clean snapd cache
if command -v snap &> /dev/null; then
    snap set system refresh.retain=2
    rm -rf /var/lib/snapd/cache/*
fi

# Clean flatpak unused runtimes
if command -v flatpak &> /dev/null; then
    flatpak uninstall --unused -y
fi

print_success "Application caches cleaned"

# 8. User Cleanup
print_header "User Directory Cleanup"

# Clean user Downloads folders older than 30 days
find /home/*/Downloads -type f -atime +30 -delete 2>/dev/null

# Remove old bash history
find /home -type f -name ".bash_history" -exec sh -c 'echo "" > {}' \;

print_success "User directories cleaned"

# Calculate space freed
final_usage=$(df -B1 / | awk 'NR==2 {print $3}')
space_freed=$((initial_usage - final_usage))
formatted_space=$(format_size $space_freed)

print_header "Cleanup Complete"
echo -e "${GREEN}Total space freed: $formatted_space${NC}"

# Show current disk usage
echo -e "\n${YELLOW}Current Disk Usage:${NC}"
df -h / | awk 'NR==1{print} NR==2{print}'

# Optional: Sync disks and clear RAM cache
sync
echo 3 > /proc/sys/vm/drop_caches
