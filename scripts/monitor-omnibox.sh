#!/bin/bash
# OmniBox Setup Progress Monitor
# Displays real-time Windows installation progress

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Progress bar function
draw_progress_bar() {
    local percent=$1
    local width=50
    local filled=$((percent * width / 100))
    local empty=$((width - filled))

    printf "["
    printf "%${filled}s" | tr ' ' '='
    printf "%${empty}s" | tr ' ' ' '
    printf "] %3d%%" "$percent"
}

# Format elapsed time
format_time() {
    local seconds=$1
    local hours=$((seconds / 3600))
    local minutes=$(((seconds % 3600) / 60))
    local secs=$((seconds % 60))

    if [ $hours -gt 0 ]; then
        printf "%dh %dm %ds" $hours $minutes $secs
    elif [ $minutes -gt 0 ]; then
        printf "%dm %ds" $minutes $secs
    else
        printf "%ds" $secs
    fi
}

# Estimate remaining time (very rough estimate)
estimate_remaining() {
    local progress=$1
    local elapsed=$2

    if [ $progress -eq 0 ]; then
        echo "Calculating..."
        return
    fi

    # Average time per percent
    local time_per_percent=$((elapsed / progress))
    local remaining_percent=$((100 - progress))
    local remaining_seconds=$((time_per_percent * remaining_percent))

    format_time $remaining_seconds
}

echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo -e "${BLUE}   OmniBox Windows Setup Monitor${NC}"
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Monitoring: http://localhost:5000/setup/status${NC}"
echo -e "${CYAN}Press Ctrl+C to exit${NC}"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Note: 'jq' not found. Install for better formatting:${NC}"
    echo "  Ubuntu/Debian: sudo apt-get install jq"
    echo "  macOS: brew install jq"
    echo ""
fi

# Monitor loop
last_stage=""
last_percent=0

while true; do
    # Fetch status
    response=$(curl -s http://localhost:5000/setup/status 2>/dev/null)

    if [ $? -ne 0 ] || [ -z "$response" ]; then
        echo -ne "\r${RED}✗ API not responding - waiting for Windows VM to start...${NC}\033[K"
        sleep 5
        continue
    fi

    # Parse JSON (use jq if available, otherwise basic parsing)
    if command -v jq &> /dev/null; then
        stage=$(echo "$response" | jq -r '.stage // "Unknown"')
        details=$(echo "$response" | jq -r '.details // ""')
        progress=$(echo "$response" | jq -r '.progress // 0')
        total=$(echo "$response" | jq -r '.total // 12')
        percent=$(echo "$response" | jq -r '.percent // 0')
        elapsed=$(echo "$response" | jq -r '.elapsed_seconds // 0')
        is_complete=$(echo "$response" | jq -r '.is_complete // false')
    else
        # Basic parsing without jq
        stage=$(echo "$response" | grep -o '"stage":"[^"]*"' | cut -d'"' -f4)
        progress=$(echo "$response" | grep -o '"progress":[0-9]*' | cut -d':' -f2)
        percent=$(echo "$response" | grep -o '"percent":[0-9.]*' | cut -d':' -f2)
        elapsed=$(echo "$response" | grep -o '"elapsed_seconds":[0-9]*' | cut -d':' -f2)
        is_complete=$(echo "$response" | grep -o '"is_complete":[a-z]*' | cut -d':' -f2)
        total=12
        details=""
    fi

    # Convert percent to integer for progress bar
    percent_int=${percent%.*}
    if [ -z "$percent_int" ]; then
        percent_int=0
    fi

    # Clear previous lines if stage changed
    if [ "$stage" != "$last_stage" ] || [ "$percent_int" -gt "$last_percent" ]; then
        echo -ne "\r\033[K"  # Clear line
    fi

    last_stage="$stage"
    last_percent=$percent_int

    # Display status
    if [ "$is_complete" = "true" ]; then
        echo -e "\r${GREEN}✓ Setup complete!${NC}\033[K"
        echo ""
        draw_progress_bar 100
        echo ""
        echo -e "${GREEN}Windows VM is ready!${NC}"
        echo -e "${CYAN}Elapsed time: $(format_time $elapsed)${NC}"
        echo ""
        exit 0
    else
        # Show progress
        echo -ne "\r"
        draw_progress_bar $percent_int
        echo -e "  ${CYAN}Step $progress/$total${NC}\033[K"
        echo -ne "${YELLOW}$stage${NC}"
        if [ -n "$details" ]; then
            echo -ne " - $details"
        fi
        echo -e "\033[K"

        # Show timing info
        elapsed_str=$(format_time $elapsed)
        remaining_str=$(estimate_remaining $percent_int $elapsed)
        echo -ne "${CYAN}Elapsed: $elapsed_str${NC} | ${CYAN}Est. remaining: $remaining_str${NC}\033[K"

        # Move cursor up 3 lines for next update
        echo -ne "\033[3A"
    fi

    sleep 2
done
