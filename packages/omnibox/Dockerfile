# OmniBox - Windows 11 Desktop for AI Agents
# Based on Microsoft OmniParser OmniBox
# Source: https://github.com/microsoft/OmniParser/tree/master/omnitool/omnibox

# For simplicity, we use the pre-built dockurr/windows image
# which provides a Windows 11 environment with KVM/QEMU

# To build from source (advanced), see Microsoft's original Dockerfile at:
# https://github.com/microsoft/OmniParser/blob/master/omnitool/omnibox/Dockerfile

FROM dockurr/windows:latest

# Set environment variables for Windows 11 Enterprise
ENV VERSION="win11e" \
    RAM_SIZE="8G" \
    CPU_CORES="4" \
    DISK_SIZE="64G"

# Expose ports
# 8006: Web viewer
# 3389: RDP
# 5000: Computer Use API (PyAutoGUI server)
# 5900: VNC
EXPOSE 8006 3389 5000 5900

# Labels
LABEL maintainer="Bytebot Hawkeye"
LABEL description="Windows 11 Desktop Environment for AI Agent Testing"
LABEL version="1.0.0"
LABEL based-on="Microsoft OmniParser OmniBox"

# Note: The actual Windows installation and Computer Use API setup
# happens at runtime through the base image's entry script.
# Place Windows 11 ISO in ./iso/custom.iso before first run.
