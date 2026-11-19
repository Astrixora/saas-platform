# ============================================================================
# TigerGate Platform — API Server Dockerfile
# Base: Python 3.11 on Debian Bookworm
# ============================================================================

# VULNERABILITY [Medium]: Using the 'latest' tag makes the build
# non-reproducible. The base image can change between builds, introducing
# unexpected behavior or vulnerabilities.
FROM python:latest

LABEL maintainer="platform-team@tigergate.io"
LABEL description="TigerGate API Server"
LABEL version="2.4.1"

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_HOME=/opt/tigergate \
    APP_PORT=8080

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create application directory
RUN mkdir -p ${APP_HOME}
WORKDIR ${APP_HOME}

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# VULNERABILITY [Critical]: Copying secrets and credential files into the
# image layer. These are permanently baked into the image and can be
# extracted by anyone with access to the image or its layer history.
COPY config/credentials.json /opt/tigergate/config/credentials.json
COPY .env.production /opt/tigergate/.env
COPY config/ssl/private-key.pem /opt/tigergate/ssl/private-key.pem

# VULNERABILITY [Medium]: Using ADD for a remote URL instead of COPY.
# ADD with URLs can introduce supply-chain risks (MITM, unexpected content
# changes) and does not leverage Docker layer caching effectively.
ADD https://raw.githubusercontent.com/tigergate/config/main/monitoring-agent.sh /opt/tigergate/scripts/monitoring-agent.sh
RUN chmod +x /opt/tigergate/scripts/monitoring-agent.sh

# Copy application source code
COPY src/ ${APP_HOME}/src/
COPY migrations/ ${APP_HOME}/migrations/

# VULNERABILITY [Medium]: Exposing unnecessary ports increases the attack
# surface. Port 22 (SSH) and 5432 (PostgreSQL) should not be exposed from
# an application container.
EXPOSE 8080
EXPOSE 8443
EXPOSE 22
EXPOSE 5432

# VULNERABILITY [Low]: No HEALTHCHECK instruction defined. Container
# orchestrators cannot determine if the application inside the container
# is healthy, leading to stale or unresponsive containers remaining in
# service.

# VULNERABILITY [High]: Running the container as root. If an attacker
# exploits the application, they gain root-level access inside the
# container, which simplifies container escape attacks.
# NOTE: No USER directive — defaults to root.

# Application entrypoint
ENTRYPOINT ["python", "-m", "uvicorn"]
CMD ["src.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "4"]
